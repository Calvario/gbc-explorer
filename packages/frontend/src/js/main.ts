declare var COIN_SYMBOL: string;
declare var COIN_CONFIRMATIONS: string;
declare var COINGECKO_SYMBOL: string;

let currentBlock: number | undefined;

// General - Functions
function formatBytes(a: number) {
  if (0 === a) return "0 B";
  const b = 2;
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

function formatEpochToDate(epoch: number) {

  const date = new Date(epoch * 1000);

  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  const day = ("0" + date.getDate()).substr(-2);
  const hours = ("0" + date.getHours()).substr(-2);
  const minutes = ("0" + date.getMinutes()).substr(-2);
  const seconds = ("0" + date.getSeconds()).substr(-2);

  const dateTime = day + ' ' + month + ' ' + year
    + ' ' + hours + ':' + minutes + ':' + seconds + '';

  return dateTime;
}

function formatNumber(nb: number, size: number = 5, symbol: string = '', locale: string = "en") {
  if(isNaN(nb)) {
    return '';
  }

  const options = {
    minimumFractionDigits: size,
    maximumFractionDigits: size
  };
  return Number(nb).toLocaleString(locale, options) + (symbol !== '' ? ' ' + symbol : '');
}

function formatNumberPercentage(value: number) {
  return formatNumber(value, 2, '%')
}

function formatNumberFiat(value: number) {
  return formatNumber(value, 2, '$')
}

function formatNumberBTC(value: number) {
  return formatNumber(value, 9)
}

function formatNumberCoin(value: number) {
  return formatNumber(value, 5, COIN_SYMBOL)
}

function formatNumberDifficulty(value: number) {
  return formatNumber(value, 5)
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

function addOverflowControl(value: string) {
  return '<span class="text-overflow-dynamic-container"><span class="text-overflow-dynamic-ellipsis">' + value + '</span></span>';
}

function getUrlParameter() {
  const pathname = window.location.pathname;
  return pathname.substring(pathname.lastIndexOf('/') + 1);
};

function navigationControl(menuItem: string, itemInfo: string, pAllItemInfo: string[] = [], refresh: boolean = false) {
  // Remove active menu
  $("li").each(function () {
    $(this).removeClass("is-active");
  });

  // Hide all divs
  pAllItemInfo.forEach((element) => {
    $(element).addClass("is-hidden");
  });

  // Set active menu
  $(menuItem).parent().addClass('is-active');

  // Remove hidden on div
  $(itemInfo).removeClass('is-hidden');
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
  const link = "https://api.coingecko.com/api/v3/simple/price?ids=" + COINGECKO_SYMBOL + "&vs_currencies=usd%2Cbtc&include_market_cap=true&include_24hr_vol=true";
  $.get(link, (data, textStatus, jqXHR) => {
    $('#layoutBTCPrice').text(formatNumberBTC(data[COINGECKO_SYMBOL].btc));
    $('#layoutUSDPrice').text(formatNumberFiat(data[COINGECKO_SYMBOL].usd));
    $('#layoutMarketCap').text(formatNumberFiat(data[COINGECKO_SYMBOL].usd_market_cap));
  });

  $.get('/rest/api/1/rpc/getmininginfo', (data, textStatus, jqXHR) => {
    $('#layoutNetworkHash').text(formatNumber(data["nethashrate (kH/m)"], 2, 'kH/m'));
  });

  $.get('/rest/api/1/rpc/getblockchaininfo', (data, textStatus, jqXHR) => {
    $('#layoutSupply').text(formatNumberCoin(data.totalsupply));
  });
}

function homeBlocks(params: any) {
  $.ajax({
      type: "GET",
      url: "/rest/api/1/block?limit=100",
      success: (data) => {
        // Check for notification
        if (data[0] !== undefined) homeBlocksCheckNew(data[0].height);

        params.success({
          "rows": data,
          "total": data.length
        })
      },
      error: (err) => {
        params.error(err);
      }
  });
}

function homeBlocksCheckNew(blockHeight: number) {
  if (currentBlock === undefined) {
    currentBlock = blockHeight;
  } else if (Number(blockHeight) > Number(currentBlock)) {
    createNotification("New block " + blockHeight + ', previous: ' + currentBlock);
    currentBlock = blockHeight;
  }
}

function homeBlocksBlockLink(value: string, row: any) {
  return '<a href="/block/' + row.hash + '">' + value + '</a>';
}

function homeBlocksExtractedLink(value: string, row: any) {
  const link = '<a href="/extraction/' + value + '">' + (row.miner.label !== null ? row.miner.label : value) + '</a>';
  return addOverflowControl(link);
}

function homeTransactions(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/transaction?limit=100",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeTransactionsBlockLink(value: string, row: any) {
  return '<a href="/block/' + row.block.hash + '">' + value + '</a>';
}

function homeTransactionsTransactionLink(value: string) {
  const link = '<a href="/transaction/' + value + '">' + value + '</a>';
  return addOverflowControl(link);
}

function homeExtraction(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/extraction?limit=100",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeExtractionAddressLink(value: string) {
  const link = '<a href="/address/' + value + '">' + value + '</a>';
  return addOverflowControl(link);
}

function homeExtractionExtractionLink(value: string, row: any) {
  const link = '<a href="/extraction/' + row.address + '">' + value + '</a>';
  return addOverflowControl(link);
}

function homeNetwork(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/peer",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeNetworkAddNodeButton(value: string)  {
  const link = '<button onclick="homeNetworkAddNodeModal(' + value + ')" class="button is-small">AddNode</button>';
  return link;
}

function homeNetworkAddNodeModal(version: number)  {
  $.get('/rest/api/1/peer/' + version, (data, textStatus, jqXHR) => {
    let peersList: string = '';
    $('#homeNetworkModal').toggleClass("is-active");
    $('#homeNetworkModalTitle').text(data.subVersion);
    for(const peer of data.peers) {
      peersList += '<p>addnode=' + peer.ip + (peer.port !== null ? ':' + peer.port : '') + '</p>';
    }
    $('#homeNetworkPre').html(peersList);
  });
}

function homeAddresses(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/address?limit=100",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeAddressesAddressLink(value: string, row: any) {
  const link = '<a href="/address/' + value + '">' + (row.label !== null ? row.label : value) + '</a>';
  return addOverflowControl(link);
}

function homeMarket(params: any) {
  const link = "https://api.coingecko.com/api/v3/coins/" + COINGECKO_SYMBOL + "/tickers?id=" + COINGECKO_SYMBOL;
  $.ajax({
    type: "GET",
    url: link,
    success: (data) => {
      params.success({
        "rows": data.tickers,
        "total": data.tickers.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeMarketPair(value: string, row: any) {
  return row.base + '/' + row.target;
}

// Block page - Functions
function blockTransactions(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/block/" + getUrlParameter() + "/transactions",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function blockTransactionsTransaction(value: string, row: any) {
  const link = '<a href="/transaction/' + value + '">' + value + '</a>';
  return addOverflowControl(link);
}

function blockTransactionsDetails(index: string, row: any, detail: any) {
  const subTableColumns: any[] = [];
  const subTableData: any[] = [];
  const size = row.vins.length >= row.vouts.length ? row.vins.length : row.vouts.length;

  subTableColumns.push({
    title: 'Value',
    halign: 'right',
    align: 'right',
    field: 'vin.vout.value',
    formatter: 'formatNumberCoin',
  });

  subTableColumns.push({
    title: 'From',
    halign: 'left',
    align: 'left',
    formatter: 'blockTransactionsVin',
  });

  subTableColumns.push({
    title: 'Value',
    halign: 'right',
    align: 'right',
    field: 'vout.value',
    formatter: 'formatNumberCoin',
  });

  subTableColumns.push({
    title: 'To',
    halign: 'left',
    align: 'left',
    formatter: 'blockTransactionsVout',
  });

  for (let i = 0; i < size; i++) {
    subTableData.push({
      vin: row.vins[i] !== undefined ? row.vins[i] : undefined,
      vout: row.vouts[i] !== undefined ? row.vouts[i] : undefined,
    })
  }

  return detail.html('<table></table>').find('table').bootstrapTable({
    columns: subTableColumns,
    data: subTableData,
  })
}

function blockTransactionsVin(value: string, row: any) {
  if(row.vin === null || row.vin === undefined) {
    return '';
  } else if (row.vin.vout === null || row.vin.vout === undefined) {
    return '<p class="has-text-primary">Coinbase</p>'
  } else {
    return addOverflowControl('<a href="/address/' + row.vin.vout.addresses[0].address + '">' + row.vin.vout.addresses[0].address + '</a>');
  }
}

function blockTransactionsVout(value: string, row: any) {
  if(row.vout === null || row.vout === undefined) {
    return '';
  } else {
    return addOverflowControl('<a href="/address/' + row.vout.addresses[0].address + '">' + row.vout.addresses[0].address + '</a></span>');
  }
}

// Transaction page - Functions
function transactionVinPrevious(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined) {
    return addOverflowControl(
      '<span>' + row.vout.n + ': <a href="/transaction/' + row.vout.transaction.hash + '">' + row.vout.transaction.hash + '</a></span>');
  } else {
    return '<p class="has-text-primary">N/A</p>';
  }
}

function transactionVinAddress(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined) {
    return addOverflowControl('<a href="/address/' + row.vout.addresses[0].address + '">' + row.vout.addresses[0].address + '</a>')
  } else {
    return '<p class="has-text-primary">Coinbase</p>';
  }
}

function transactionVinAmount(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined) {
    return '<p>' + row.vout.value + '</p>';
  } else {
    return '<p class="has-text-primary">N/A</p>';
  }
}

function transactionVoutRedeemed(value: string, row: any) {
  if (row.vin !== null && row.vin !== undefined) {
    return addOverflowControl('<a href="/transaction/' + row.vin.transaction.hash + '">' + row.vin.transaction.hash + '</a>');
  } else {
    return '<p class="has-text-primary">Not yet redeemed</p>';
  }
}

function transactionVoutAddress(value: string, row: any) {
  return addOverflowControl('<a href="/address/' + row.addresses[0].address + '">' + row.addresses[0].address + '</a></span>');
}

// Address page - Functions
function addressTransactions(params: any) {
  $.ajax({
    type: "GET",
    url: "/rest/api/1/address/" + getUrlParameter() + "/transactions?limit=100",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function addressTransactionsTransaction(value: string, row: any) {
  const nVout = row.vout_n !== null ? '<span>' + row.vout_n + ': </span>' : '';
  const link = nVout + '<a href="/transaction/' + value + '">' + value + '</a>';
  return addOverflowControl(link);
}

function addressTransactionsBlock(value: string, row: any) {
  return '<a href="/block/' + row.block_hash + '">' + row.block_height + '</a>';
}

function addressTransactionsValue(value: string, row: any) {
  return formatNumberCoin(row.vout_value !== null ? row.vout_value : - row.vinvout_value);
}

// Extraction page - Functions
function extractionBlocks(params: any) {
  $.ajax({
    type: "GET",
    url: '/rest/api/1/extraction/' + getUrlParameter() + "?limit=100",
    success: (data) => {
      params.success({
        "rows": data,
        "total": data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function extractionBlockBlockLink(value: string, row: any) {
  return '<a href="/block/' + row.hash + '">' + value + '</a>';
}

// Mapping
$(document).ready(() => {

  // Layout: Search
  $('#layoutSearch').keypress((e) => {
    if (e.which === 13) {
      $.get('/rest/api/1/general?search=' + $('#layoutSearch').val(), (data, textStatus, jqXHR) => {
        if (data.length === 1) {
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

    const allItemInfo = ['#homeBlocksDiv', '#homeTransactionsDiv',
      '#homeAddressesDiv', '#homeExtractionDiv', '#homeNetworkDiv',
      '#homeMarketDiv', '#homeNewsDiv'];

    // Toggle div when from an anchor
    const hash = window.location.hash;
    if (hash !== "") {
      navigationControl(hash, hash +"Div", allItemInfo, true);
    }

    $('#homeBlocks').click(() => {
      navigationControl('#homeBlocks', "#homeBlocksDiv", allItemInfo, true);
    });

    $('#homeTransactions').click(() => {
      navigationControl('#homeTransactions', "#homeTransactionsDiv", allItemInfo, true);
    });

    $('#homeNetwork').click(() => {
      navigationControl('#homeNetwork', "#homeNetworkDiv", allItemInfo, true);
    });

    $('#homeNetworkModalClose').click(() => {
      $('#homeNetworkModal').toggleClass("is-active");
    });

    $('#homeExtraction').click(() => {
      navigationControl('#homeExtraction', "#homeExtractionDiv", allItemInfo, true);
    });

    $('#homeAddresses').click(() => {
      navigationControl('#homeAddresses', "#homeAddressesDiv", allItemInfo, true);
    });

    $('#homeMarket').click(() => {
      navigationControl('#homeMarket', "#homeMarketDiv", allItemInfo);
    });

    $('#homeNews').click(() => {
      navigationControl('#homeNews', "#homeNewsDiv", allItemInfo);
    });

    // Page initialization
    updateLayoutMarketBoxes();

    // Auto refresh
    setInterval(
      updateLayoutMarketBoxes,
      60000
    );
  }

  // Page specific : Block
  if ($(location).attr('pathname')!.indexOf('/block') === 0) {
    const allItemInfo = ['#blockTransactionsDiv', '#blockJSONDiv'];

    $('#blockTransactions').click(() => {
      navigationControl('#blockTransactions', '#blockTransactionsDiv', allItemInfo);
      $.get('/rest/api/1/block/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#blockHeight').text('"' + data.height + '"');
        $.get('/rest/api/1/block/' + getUrlParameter() + '/confirmations', (confirmations) => {
          const iIcon = $('<i></i>').addClass('fas fa-check');
          const spanIcon = $('<span></span>').addClass('icon ml-1').append(iIcon);
          if (data.onMainChain === true && confirmations.confirmations >= COIN_CONFIRMATIONS) {
            $('#blockConfirmation').text(confirmations.confirmations).addClass("is-success").append(spanIcon);
          } else if (data.onMainChain === true && confirmations.confirmations < COIN_CONFIRMATIONS) {
            $('#blockConfirmation').text(confirmations.confirmations).addClass("is-warning").append(spanIcon);
          } else {
            $('#blockConfirmation').text("Rejected").addClass("is-danger");
          }
        });
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
    });

    $('#blockJSON').click(() => {
      navigationControl('#blockJSON', '#blockJSONDiv', allItemInfo);
      $.get('/rest/api/1/rpc/getblock/' + getUrlParameter() + '?verbosity=2', (data, textStatus, jqXHR) => {
        $('#blockJSONDiv').children().html(formatJSON(JSON.stringify(data, undefined, 2)));
      });
    });

    // Page initialization
    $("#blockTransactions").trigger('click');
  }

  // Page specific : Transaction
  if ($(location).attr('pathname')!.indexOf('/transaction') === 0) {

    const allItemInfo = ['#transactionVinsDiv', '#transactionVoutsDiv', '#transactionJSONDiv'];

    function getTransaction() {
      $.get('/rest/api/1/transaction/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#transactionId').text(data.hash);
        $.get('/rest/api/1/block/' + data.block.hash + '/confirmations', (confirmations) => {
          const iIcon = $('<i></i>').addClass('fas fa-check');
          const spanIcon = $('<span></span>').addClass('icon ml-1').append(iIcon);
          if (data.block.onMainChain === true && confirmations.confirmations >= COIN_CONFIRMATIONS) {
            $('#transactionConfirmation').text(confirmations.confirmations).addClass("is-success").append(spanIcon);
          } else if (data.block.onMainChain === true && confirmations.confirmations < COIN_CONFIRMATIONS) {
            $('#transactionConfirmation').text(confirmations.confirmations).addClass("is-warning").append(spanIcon);
          } else {
            $('#transactionConfirmation').text("Rejected").addClass("is-danger");
          }
        });
        $('#transactionBlock').text(data.block.height);
        $('#transactionBlock').attr("href", '/block/' + data.block.hash);
        $('#transactionTime').text(formatEpochToDate(data.time));
        $('#transactionSize').text(formatBytes(data.size));
        $('#transactionInputs').text(data.inputC);
        $('#transactionIn').text(' ( ' + data.inputT + ' )');
        $('#transactionOutputs').text(data.outputC);
        $('#transactionOut').text(' ( ' + data.outputT + ' )');
        $('#transactionFee').text(data.fee);

        ($("#transactionVinsTable") as any).bootstrapTable({
          data: {
            "rows": data.vins,
            "total": data.vins.length
          }
        });
        ($("#transactionVoutsTable") as any).bootstrapTable({
          data: {
            "rows": data.vouts,
            "total": data.vouts.length
          }
        })
      });
    }

    $('#transactionVins').click(() => {
      navigationControl('#transactionVins', '#transactionVinsDiv', allItemInfo);
    });

    $('#transactionVouts').click(() => {
      navigationControl('#transactionVouts', '#transactionVoutsDiv', allItemInfo);
    });

    $('#transactionJSON').click(() => {
      navigationControl('#transactionJSON', '#transactionJSONDiv', allItemInfo);
      $.get('/rest/api/1/rpc/getrawtransaction/' + getUrlParameter() + '?verbose=true', (data, textStatus, jqXHR) => {
        $('#transactionJSONDiv').children().html(formatJSON(JSON.stringify(data, undefined, 2)));
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
  }

  // Page specific : Extraction
  if ($(location).attr('pathname')!.indexOf('/extraction') === 0) {
    $("#extractionAddress").text(getUrlParameter());
    $("#extractionAddress").attr("href", '/address/' + getUrlParameter());
  }

  // Page specific : FAQ
  if ($(location).attr('pathname')!.indexOf('/faq') === 0) {
    // Toggle div when from an anchor
    const hash = window.location.hash;
    if (hash !== "") {
      $(hash).toggle();
    }

    $("#financial-disclaimer").click(() => {
      $("#financial-disclaimer-content").toggle();
    });
  }
});