declare var COIN_SYMBOL: string;
declare var COINGECKO_SYMBOL: string;

let getAfterId: number | undefined;
let currentTab: string | undefined;
let currentBlock: number | undefined;
let allItemInfo: string[] | undefined;

// General - Functions
function formatBytes(a: number, b: number = 2) {
  if (0 === a) return "0 B";
  const c = 0 > b ? 0 : b;
  const d = Math.floor(Math.log(a) / Math.log(1024));
  return parseFloat((a / Math.pow(1024, d)).toFixed(c)) + " " + ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
}

function formatEpochToAge(epoch: number) {
  const epochDate = new Date(epoch * 1000).getTime();

  const now = new Date().getTime();
  const distance = now - epochDate;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // If it's older then 30 days display the date
  if (days < 30) {
    if (days !== 0)
      return days + "d " + hours + "h " + minutes + "m " + seconds + "s ";
    else if (hours !== 0)
      return hours + "h " + minutes + "m " + seconds + "s ";
    else if (minutes !== 0)
      return minutes + "m " + seconds + "s ";
    else
      return seconds + "s ";
  } else {
    return formatEpochToDate(epoch);
  }
}

function formatEpochToDate(epoch: number){

  const date = new Date(epoch * 1000);

  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  const day = ("0" + date.getDate()).substr(-2);
  const hours = ("0" + date.getHours()).substr(-2);
  const minutes = ("0" + date.getMinutes()).substr(-2);
  const seconds = ("0" + date.getSeconds()).substr(-2);

  const dateTime = day + ' ' + month + ' ' + year
    + ' '+ hours + ':' + minutes + ':' + seconds + '';

  return dateTime;
}

function formatNumber(nb: number, size = 5) {
  const options = {
    minimumFractionDigits: size,
    maximumFractionDigits: size
  };
  return Number(nb).toLocaleString('en', options);
}

function formatJSON(json: string) {
  if (typeof json !== 'string') {
     json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

function hideTableColumn(tableId: number, columnNb: number) {
  $(tableId + 'tr > *:nth-child(' + columnNb + ')').hide();
}

function formatTableDataLabel(id: string) {
  $(id + ' th').each((i,elem) => {
    const num = i + 1;
    $('table td:nth-child(' + num + ')').attr('data-label', $(elem).text());
  });
}

function getUrlParameter() {
  const pathname = window.location.pathname;
  return pathname.substring(pathname.lastIndexOf('/') + 1);
};

function navigationControl(menuItem: string, itemInfo: string, pAllItemInfo: string[] = [], refresh: boolean = false){
  // Reset get next afterId
  getAfterId = undefined;

  $("li").each(function() {
    $(this).removeClass("is-active");
  });

  // Hide all
  pAllItemInfo.forEach((element) => {
    $(element).parent().addClass("is-hidden");
  });

  // Set active menu
  $(menuItem).parent().addClass('is-active');

  // Remove hidden
  $(itemInfo).parent().removeClass('is-hidden');

  // Async auto refresh
  if (refresh === true) {
    currentTab = menuItem;
  }
}

function createNotification(message: string) {
  if (location.protocol === 'https:') {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      const n = new Notification(message);
      setTimeout(n.close.bind(n), 5000);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          const n = new Notification(message);
          setTimeout(n.close.bind(n), 5000);
        }
      });
    }
  }
}

// Home page - Functions
function updateLayoutMarketBoxes() {
  const link =  "https://api.coingecko.com/api/v3/simple/price?ids=" + COINGECKO_SYMBOL + "&vs_currencies=usd%2Cbtc&include_market_cap=true&include_24hr_vol=true";
  $.get(link, (data, textStatus, jqXHR) => {
    $('#layoutBTCPrice').text(data[COINGECKO_SYMBOL].btc);
    $('#layoutUSDPrice').text(formatNumber(data[COINGECKO_SYMBOL].usd, 2) + ' $');
    $('#layoutMarketCap').text(formatNumber(data[COINGECKO_SYMBOL].usd_market_cap, 2) + ' $');
  });

  $.get('/rest/api/1/rpc/getmininginfo', (data, textStatus, jqXHR) => {
    $('#layoutNetworkHash').text(formatNumber(data["nethashrate (kH/m)"], 2) + ' kH/m');
  });

  $.get('/rest/api/1/rpc/getblockchaininfo', (data, textStatus, jqXHR) => {
    $('#layoutSupply').text(formatNumber(data.totalsupply, 0));
  });
}

function newBlockCheck(blockHeight: number) {
  if (currentBlock === undefined) {
    currentBlock = blockHeight;
  } else if (Number(blockHeight) > Number(currentBlock)) {
    createNotification("New block " + blockHeight + ', previous: ' + currentBlock);
    currentBlock = blockHeight;
  }
}

function homeBlocks(afterId: number | undefined) {
  const pagination = afterId === undefined ? '' : '?limit=100&afterId=' + afterId;
  $.get('/rest/api/1/block' + pagination, (data, textStatus, jqXHR) => {
    if (afterId === undefined) {
      // Clean tables
      $("#homeBlocksTable tbody tr").remove();
    }
    getAfterId = data.length >= 1 ? data[data.length - 1].id : getAfterId;
    // Check for notification
    if(data[0] !== undefined) newBlockCheck(data[0].height);
    $.each(data, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').append(
          $('<a href="/block/' + item.hash + '">').text(item.height)
        ),
        $('<td class="has-text-right">').text(formatEpochToAge(item.time)),
        $('<td class="has-text-right">').text(item.nTx),
        $('<td class="has-text-right">').text(item.inputC),
        $('<td class="has-text-right">').text(item.outputC),
        $('<td class="has-text-right">').text(formatNumber(item.outputT)),
        $('<td class="has-text-right">').text(formatNumber(item.generation)),
        $('<td class="has-text-right">').text(formatNumber(item.feesT)),
        $('<td class="has-text-right">').text(formatBytes(item.size,2)),
        $('<td class="has-text-right">').text(formatNumber(item.difficulty)),
        $('<td class="has-text-left-desktop">').append(
          $('<span class="text-overflow-dynamic-container">').append(
            $('<span class="text-overflow-dynamic-ellipsis">').append(
              $('<a href="/extraction/' + item.miner.address + '">').text((item.miner.label !== null ? item.miner.label : item.miner.address ))
            )
          )
        )
      ).appendTo('#homeBlocksTable');
    });
    formatTableDataLabel('#homeBlocksTable');
  });
}

function homeTransactions(afterId: number | undefined) {
  const pagination = afterId === undefined ? '' : '?limit=100&afterId=' + afterId;
  $.get('/rest/api/1/transaction' + pagination, (data, textStatus, jqXHR) => {
    if (afterId === undefined) {
      // Clean table
      $("#homeTransactionsTable tbody tr").remove();
    }
    getAfterId = data.length >= 1 ? data[data.length - 1].id : getAfterId;
    $.each(data, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').append(
          $('<a href="/block/' + item.block.hash + '">').text(item.block.height)
        ),
        $('<td class="has-text-left-desktop">').append(
          $('<span class="text-overflow-dynamic-container">').append(
            $('<span class="text-overflow-dynamic-ellipsis">').append(
              $('<a href="/transaction/' + item.hash + '">').text(item.hash)
            )
          )
        ),
        $('<td class="has-text-right">').text(formatEpochToAge(item.time)),
        $('<td class="has-text-right">').text(item.inputC),
        $('<td class="has-text-right">').text(item.outputC),
        $('<td class="has-text-right">').text(formatNumber(item.outputT)),
        $('<td class="has-text-right">').text(formatNumber(item.fee)),
        $('<td class="has-text-right">').text(formatBytes(item.size,2))
      ).appendTo('#homeTransactionsTable');
    });
    formatTableDataLabel('#homeTransactionsTable');
  });
}

function homeAddresses() {
  $.get('/rest/api/1/address', (data, textStatus, jqXHR) => {
    $("#homeAddressesTable tbody tr").remove();
    $.each(data, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').text(Number(i) + 1),
        $('<td class="has-text-left-desktop">').append(
          $('<span class="text-overflow-dynamic-container">').append(
            $('<span class="text-overflow-dynamic-ellipsis">').append(
              $('<a href="/address/' + item.address + '">').text((item.label !== null ? item.label : item.address ))
            )
          )
        ),
        $('<td class="has-text-right">').text(formatNumber(item.balance)),
        $('<td class="has-text-right">').text(item.nTx),
        $('<td class="has-text-right">').text(item.inputC),
        $('<td class="has-text-right">').text(item.outputC)
      ).appendTo('#homeAddressesTable');
    });
    formatTableDataLabel('#homeAddressesTable');
  });
}

function homeExtraction() {
  $.get('/rest/api/1/extraction', (data, textStatus, jqXHR) => {
    $("#homeExtractionTable tbody tr").remove();
    $.each(data, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').text(Number(i) + 1),
        $('<td class="has-text-left-desktop">').append(
          $('<span class="text-overflow-dynamic-container">').append(
            $('<span class="text-overflow-dynamic-ellipsis">').text(item.label)
          )
        ),
        $('<td class="has-text-left-desktop">').append(
          $('<span class="text-overflow-dynamic-container">').append(
            $('<span class="text-overflow-dynamic-ellipsis">').append(
              $('<a href="/extraction/' + item.address + '">').text(item.address)
            )
          )
        ),
        $('<td class="has-text-right">').text(item.count)
      ).appendTo('#homeExtractionTable');
    });
    formatTableDataLabel('#homeExtractionTable');
  });
}

function homeMarket() {
  const link =  "https://api.coingecko.com/api/v3/coins/" + COINGECKO_SYMBOL + "/tickers?id=" + COINGECKO_SYMBOL;
  $.get(link, (data, textStatus, jqXHR) => {
    // Clean table
    $("#homeMarketTable tbody tr").remove();
    $.each(data.tickers, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').text(item.market.name),
        $('<td class="has-text-right">').text(item.base + '/' + item.target),
        $('<td class="has-text-right">').text(formatNumber(item.converted_last.usd, 2) + ' $'),
        $('<td class="has-text-right">').text(formatNumber(item.converted_last.btc, 9)),
        $('<td class="has-text-right">').text(formatNumber(item.volume, 9)),
        $('<td class="has-text-right">').text(formatNumber(item.converted_volume.btc, 9)),
        $('<td class="has-text-right">').text(formatNumber(item.converted_volume.usd, 2) + ' $'),
        $('<td class="has-text-right">').text(formatNumber(item.bid_ask_spread_percentage, 2) + ' %'),
      ).appendTo('#homeMarketTable');
    });
    formatTableDataLabel('#homeMarketTable');
  });
}

// Address page - Functions
function addressTransactions(afterId: number | undefined) {
  const pagination = afterId === undefined ? '' : '?limit=100&afterId=' + afterId;
  $.get('/rest/api/1/address/' + getUrlParameter() + '/transactions' + pagination, (data, textStatus, jqXHR) => {
    if (afterId === undefined) {
      // Clean table
      $("#addressTransactionsTable tbody tr").remove();
    }
    getAfterId = data.length >= 1 ? data[data.length - 1].id : getAfterId;
    $.each(data, (i, item) => {
      // Received
      $.each(item.vouts, (i2, vout) => {
        $('<tr>').append(
          $('<td class="has-text-left-desktop">').append(
            $('<span class="text-overflow-dynamic-container">').append(
              $('<span class="text-overflow-dynamic-ellipsis">').append(
                $('<span>').text(vout.n + ': ').append(
                  $('<a href="/transaction/' + item.hash + '">').text(item.hash)
                )
              )
            )
          ),
          $('<td class="has-text-right">').append(
            $('<a href="/block/' + item.block.hash + '">').text(item.block.height)
          ),
          $('<td class="has-text-right">').text(formatEpochToDate(item.block.time)),
          $('<td class="has-text-right">').text(formatNumber(vout.value)),
        ).appendTo('#addressTransactionsTable');
      });

      // Sent
      $.each(item.vins, (i3, vin) => {
        $('<tr>').append(
          $('<td class="has-text-left-desktop">').append(
            $('<span class="text-overflow-dynamic-container">').append(
              $('<span class="text-overflow-dynamic-ellipsis">').append(
                $('<span>').text(i.toString() + ': ').append(
                  $('<a href="/transaction/' + item.hash + '">').text(item.hash)
                )
              )
            )
          ),
          $('<td class="has-text-right">').append(
            $('<a href="/block/' + item.block.hash + '">').text(item.block.height)
          ),
          $('<td class="has-text-right">').text(formatEpochToDate(item.block.time)),
          $('<td class="has-text-right">').text(formatNumber(-vin.vout.value)),
        ).appendTo('#addressTransactionsTable');
      });
    });
    formatTableDataLabel('#addressTransactionsTable');
  });
}

// Extraction page - Functions
function extractionBlocks(afterId: number | undefined) {
  const pagination = afterId === undefined ? '' : '?limit=100&afterId=' + afterId;
  $.get('/rest/api/1/extraction/' + getUrlParameter() + pagination, (data, textStatus, jqXHR) => {
    if (afterId === undefined) {
      // Clean table
      $("#extractionTable tbody tr").remove();
    }
    getAfterId = data.length >= 1 ? data[data.length - 1].id : getAfterId;
    $.each(data, (i, item) => {
      $('<tr>').append(
        $('<td class="has-text-right">').append(
          $('<a href="/block/' + item.hash + '">').text(item.height)
        ),
        $('<td class="has-text-right">').text(formatEpochToDate(item.time)),
        $('<td class="has-text-right">').text(formatNumber(item.difficulty)),
        $('<td class="has-text-right">').text(formatNumber(item.generation)),
        $('<td class="has-text-right">').text(formatNumber(item.feesT)),
      ).appendTo('#extractionTable');
    });
    formatTableDataLabel('#extractionTable');
  });
}

// Mapping
$(document).ready(() => {

  // General dropdown
  $(".dropdown .button").click(function (){
    const dropdown = $(this).parents('.dropdown');
    dropdown.toggleClass('is-active');
    dropdown.focusout(function(event) {
      if (this.contains(event.currentTarget)) {
        return;
      }
      $(this).removeClass('is-active');
    });
  });

  // Layout: Search
  $('#layoutSearch').keypress((e) => {
        if(e.which === 13) {
      $.get('/rest/api/1/general?search=' + $('#layoutSearch').val(), (data, textStatus, jqXHR) => {
        if(data.length === 1) {
          window.location.replace('/' + data[0].type + '/' + data[0]._id);
        }
      });
    }
  });

  // Layout: Menu
  $(".navbar-burger").click(() => {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });

  // Page specific : Home
  if ($(location).attr('pathname') === '/') {

    allItemInfo = ['#homeBlocksTable', '#homeTransactionsTable',
      '#homeAddressesTable', '#homeMempoolTable', '#homeExtractionTable',
      '#homeMarketTable', '#homeNewsWidget'];

    $('#homeBlocks').click(() => {
      navigationControl('#homeBlocks', "#homeBlocksTable", allItemInfo, true);
      homeBlocks(getAfterId);
    });

    $('#homeBlocksGetMore').click(() => {
      homeBlocks(getAfterId);
      // Avoid auto refresh
      currentTab = undefined;
    });

    $('#homeTransactions').click(() => {
      navigationControl('#homeTransactions', "#homeTransactionsTable", allItemInfo, true);
      homeTransactions(getAfterId);
    });

    $('#homeTransactionsGetMore').click(() => {
      homeTransactions(getAfterId);
      // Avoid auto refresh
      currentTab = undefined;
    });

    $('#homeAddresses').click(() => {
      navigationControl('#homeAddresses', "#homeAddressesTable", allItemInfo, true);
      homeAddresses();
    });

    $('#homeExtraction').click(() => {
      navigationControl('#homeExtraction', "#homeExtractionTable", allItemInfo, true);
      homeExtraction();
    });

    $('#homeMarket').click(() => {
      navigationControl('#homeMarket', "#homeMarketTable", allItemInfo);
      homeMarket();
    });

    $('#homeNews').click(() => {
      navigationControl('#homeNews', "#homeNewsWidget", allItemInfo);
    });

    // Page initialization
    updateLayoutMarketBoxes();
    homeBlocks(getAfterId);

    // Auto refresh
    setInterval(() => {
      if (currentTab !== undefined)
        window.Function(currentTab)();
      },
      30000
    );
    setInterval(
      updateLayoutMarketBoxes,
      60000
    );
  }

  // Page specific : Block
  if ($(location).attr('pathname')!.indexOf('/block') === 0) {
    allItemInfo = ['#blockTransactionsTable', '#blockJSONPre'];

    $('#blockTransactions').click(() => {
      $.get('/rest/api/1/block/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#blockHeight').text(data.height);
        $('#blockHash').text(data.hash);
        $('#blockTime').text(formatEpochToDate(data.time));
        $('#blockTransactionsCount').text(data.nTx);
        $('#blockSize').text(' ( ' + formatBytes(data.size) + ' )');
        $('#blockInputs').text(data.inputC);
        $('#blockIn').text(' ( ' + data.inputT + ' )');
        $('#blockOutputs').text(data.outputC);
        $('#blockOut').text(' ( ' + data.outputT + ' )');
        $('#blockFees').text(data.feesT);
        $('#blockDifficulty').text(data.difficulty);
        $('#blockGeneration').text(data.generation);
        $('#blockMiner').attr("href", '/extraction/' + data.miner.address);
        $('#blockMiner').text(data.miner.label !== null ? data.miner.label : data.miner.address);
      });

      $.get('/rest/api/1/block/' + getUrlParameter() + '/transactions', (data, textStatus, jqXHR) => {
        navigationControl('#blockTransactions', '#blockTransactionsTable', allItemInfo);
        $("#blockTransactionsTable tbody tr").remove();
        $.each(data, (i, item) => {
          $('<tr>').append(
            $('<td class="has-text-left-desktop">').append(
              $('<span class="text-overflow-dynamic-container">').append(
                $('<span class="text-overflow-dynamic-ellipsis">').append(
                  $('<a href="/transaction/' + item.hash + '">').text(item.hash)
                )
              )
            ),
            $('<td class="has-text-right">').text(item.inputC),
            $('<td class="has-text-right">').text(item.inputT),
            $('<td class="has-text-right">').append(
              $.map(item.vins, (vin, i2) => {
                if (vin.vout !== null && vin.vout !== undefined) {
                  return $('<span class="text-overflow-dynamic-container">').append(
                    $('<span class="text-overflow-dynamic-ellipsis">').append(
                      $('<span>').text(vin.vout.value + ' ').append(
                        $('<a href="/address/' + vin.vout.addresses[0].address + '">').text(vin.vout.addresses[0].address)
                      )
                    )
                  )
                } else {
                  return $('<p class="has-text-primary">').text('Coinbase')
                }
              })
            ),
            $('<td class="has-text-right">').text(item.outputC),
            $('<td class="has-text-right">').text(item.outputT),
            $('<td class="has-text-right">').append(
              $.map(item.vouts, (vout, i3) => {
                return $('<span class="text-overflow-dynamic-container">').append(
                  $('<span class="text-overflow-dynamic-ellipsis">').append(
                    $('<span>').text(vout.value + ' ').append(
                      $('<a href="/address/' + vout.addresses[0].address + '">').text(vout.addresses[0].address)
                    )
                  )
                )
              })
            ),
            $('<td class="has-text-right">').text(item.fee),
            $('<td class="has-text-right">').text(formatBytes(item.size,2))
          ).appendTo('#blockTransactionsTable');
        });
        formatTableDataLabel('#blockTransactionsTable');
      });
    });

    $('#blockJSON').click(() => {
      navigationControl('#blockJSON', '#blockJSONPre', allItemInfo);
      $.get('/rest/api/1/rpc/getblock/' + getUrlParameter() + '?verbosity=2', (data, textStatus, jqXHR) => {
        $('#blockJSONPre').html(formatJSON(JSON.stringify(data, undefined, 2)));
      });
    });

    // Page initialization
    $("#blockTransactions").trigger('click');
  }

  // Page specific : Transaction
  if ($(location).attr('pathname')!.indexOf('/transaction') === 0) {

    allItemInfo = ['#transactionVinsTable', '#transactionVoutsTable', '#transactionJSONPre'];

    function getTransaction() {
      $.get('/rest/api/1/transaction/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#transactionId').text(data.hash);
        $('#transactionBlock').text(data.block.height);
        $('#transactionBlock').attr("href", '/block/' + data.block.hash);
        $('#transactionTime').text(formatEpochToDate(data.time));
        $('#transactionSize').text(formatBytes(data.size));
        $('#transactionInputs').text(data.inputC);
        $('#transactionIn').text(' ( ' + data.inputT + ' )');
        $('#transactionOutputs').text(data.outputC);
        $('#transactionOut').text(' ( ' + data.outputT + ' )');
        $('#transactionFee').text(data.fee);

        $("#transactionVinsTable tbody tr").remove();
        $.each(data.vins, (i, item) => {
          $('<tr>').append(
            $('<td class="has-text-right">').text(i.toString()),
            $('<td class="has-text-left-desktop">').append(
              () => {
                if (item.vout !== null && item.vout !== undefined) {
                  return $('<span class="text-overflow-dynamic-container">').append(
                    $('<span class="text-overflow-dynamic-ellipsis">').append(
                      $('<span>').text(item.vout.n + ': ').append(
                        $('<a href="/transaction/' + item.vout.transaction.hash + '">').text(item.vout.transaction.hash)
                      )
                    )
                  )
                } else {
                  return $('<p class="has-text-primary">').text('N/A')
                }
              }
            ),
            $('<td class="has-text-left-desktop">').append(
              () => {
                if (item.vout !== null && item.vout !== undefined) {
                  return $('<span class="text-overflow-dynamic-container">').append(
                    $('<span class="text-overflow-dynamic-ellipsis">').append(
                      $('<a href="/address/' + item.vout.addresses[0].address + '">').text(item.vout.addresses[0].address)
                    )
                  )
                } else {
                  return $('<p class="has-text-primary">').text('Coinbase')
                }
              }
            ),
            $('<td class="has-text-right">').append(
              () => {
                if (item.vout !== null && item.vout !== undefined) {
                  return $('<p>').text(item.vout.value)
                } else {
                  return $('<p class="has-text-primary">').text('N/A')
                }
              }
            )
          ).appendTo('#transactionVinsTable');
        });
        formatTableDataLabel('#transactionVinsTable');

        // VOUT
        $("#transactionVoutsTable tbody tr").remove();
        $.each(data.vouts, (i, item) => {
          $('<tr>').append(
            $('<td class="has-text-right">').text(item.n),
            $('<td class="has-text-left-desktop">').append(
              () => {
                if (item.vin !== null && item.vin !== undefined) {
                  return $('<span class="text-overflow-dynamic-container">').append(
                    $('<span class="text-overflow-dynamic-ellipsis">').append(
                      $('<a href="/transaction/' + item.vin.transaction.hash + '">').text(item.vin.transaction.hash)
                    )
                  )
                } else {
                  return $('<p class="has-text-primary">').text('Not yet redeemed')
                }
              }
            ),
            $('<td class="has-text-left-desktop">').append(
              $('<span class="text-overflow-dynamic-container">').append(
                $('<span class="text-overflow-dynamic-ellipsis">').append(
                  $('<a href="/address/' + item.addresses[0].address + '">').text(item.addresses[0].address)
                )
              )
            ),
            $('<td class="has-text-right">').text(item.value)
          ).appendTo('#transactionVoutsTable');
        });
        formatTableDataLabel('#transactionVoutsTable');
      });
    }

    $('#transactionVins').click(() => {
      navigationControl('#transactionVins', '#transactionVinsTable', allItemInfo);
    });

    $('#transactionVouts').click(() => {
      navigationControl('#transactionVouts', '#transactionVoutsTable', allItemInfo);
    });

    $('#transactionJSON').click(() => {
      navigationControl('#transactionJSON', '#transactionJSONPre', allItemInfo);
      $.get('/rest/api/1/rpc/getrawtransaction/' + getUrlParameter() + '?verbose=true', (data, textStatus, jqXHR) => {
        $('#transactionJSONPre').html(formatJSON(JSON.stringify(data, undefined, 2)));
      });
    });

    // Page initialization
    getTransaction();
  }

  // Page specific : Address
  if ($(location).attr('pathname')!.indexOf('/address') === 0) {

    $.get('/rest/api/1/address/' + getUrlParameter(), (data, textStatus, jqXHR) => {
      $('#addressHash').text(data.address);
      $('#addressLabel').text(data.label);
      $('#addressBalance').text(formatNumber(data.balance));
      $('#addressTransactions').text(data.nTx);
      $('#addressInputs').text(data.inputC);
      $('#addressOutputs').text(data.outputC);
    });

    $('#addressGetMore').click(() => {
      addressTransactions(getAfterId);
    });

    // Page initialization
    addressTransactions(getAfterId);
  }

  // Page specific : Extraction
  if ($(location).attr('pathname')!.indexOf('/extraction') === 0) {
    $("#extractionTable tbody tr").remove();
    $("#extractionAddress").text(getUrlParameter());
    $("#extractionAddress").attr("href", '/address/' + getUrlParameter());

    $('#extractionGetMore').click(() => {
      extractionBlocks(getAfterId);
    });

    // Page initialization
    extractionBlocks(getAfterId);
  }
});