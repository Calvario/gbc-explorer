declare var COIN_SYMBOL: string;
declare var COIN_TYPE: string;
declare var COIN_CONFIRMATIONS: string;
declare var COINGECKO_SYMBOL: string;

let myChart: Chart | undefined;
let currentBlock: number | undefined;

// General - Functions
function formatBytes(a: number) {
  if (0 === a) return '0 B';
  const b = 2;
  const c = 0 > b ? 0 : b;
  const d = Math.floor(Math.log(a) / Math.log(1024));
  return parseFloat((a / Math.pow(1024, d)).toFixed(c)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'][d]
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
      return days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's ';
    else if (hours !== 0)
      return hours + 'h ' + minutes + 'm ' + seconds + 's ';
    else if (minutes !== 0)
      return minutes + 'm ' + seconds + 's ';
    else
      return seconds + 's ';
  } else {
    return formatEpochToDate(epoch);
  }
}

function formatEpochToDate(epoch: number) {

  const date = new Date(epoch * 1000);

  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  const day = ('0' + date.getDate()).substr(-2);
  const hours = ('0' + date.getHours()).substr(-2);
  const minutes = ('0' + date.getMinutes()).substr(-2);
  const seconds = ('0' + date.getSeconds()).substr(-2);

  const dateTime = day + ' ' + month + ' ' + year
    + ' ' + hours + ':' + minutes + ':' + seconds + '';

  return dateTime;
}

function formatNumber(nb: number, size: number = 5, symbol: string = '') {
  if (isNaN(nb)) {
    return '';
  }

  const options = {
    minimumFractionDigits: size,
    maximumFractionDigits: size
  };
  return Number(nb).toLocaleString(undefined, options) + (symbol !== '' ? ' ' + symbol : '');
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
  return formatNumber(value, 9, COIN_SYMBOL)
}

function formatNumberDifficulty(value: number) {
  return formatNumber(value, 10)
}

function formatNumberMint(value: number) {
  return formatNumber(value, 8)
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

function navigationControl(itemInfo: string) {
  $("#homeDivsContainer > div").each(function () {
    const divId = '#' + this.id;
    if (divId !== itemInfo) {
      // Hide div
      $(divId).addClass('is-hidden');

      // Avoid getting all tables autorefreshing
      const bsTable = ($(divId).find('table') as any);
      const bsTableOption = bsTable.bootstrapTable('getOptions')
      if (bsTableOption.autoRefreshStatus === true) {
        bsTable.bootstrapTable('refreshOptions', { autoRefreshStatus: false });
        clearInterval(bsTableOption.autoRefreshFunction);
      }
    } else {
      // Remove hidden
      $(divId).removeClass('is-hidden');

      // Enable auto-refresh
      const bsTable = ($(divId).find('table') as any);
      const bsTableOption = bsTable.bootstrapTable('getOptions')
      if (bsTableOption.autoRefreshStatus === false) {
        ($(divId).find('table') as any).bootstrapTable('refreshOptions', { autoRefreshStatus: true });
      }
    }
  });
}


function tabsControl(menuItem: string, itemInfo: string, pAllItemInfo: string[] = [], refresh: boolean = false) {
  // Remove active menu
  $('li').each(function () {
    $(this).removeClass('is-active');
  });

  // Set active menu
  $(menuItem).parent().addClass('is-active');

  pAllItemInfo.forEach((element) => {
    if (element !== itemInfo) {
      // Add Hidden
      $(element).addClass('is-hidden');
    } else {
      // Remove hidden
      $(element).removeClass('is-hidden');
    }
  });
}

function createNotification(message: string) {
  if (location.protocol === 'https:') {
    if (Notification.permission === 'granted') {
      const n = new Notification(message);
      setTimeout(n.close.bind(n), 5000);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const n = new Notification(message);
          setTimeout(n.close.bind(n), 5000);
        }
      });
    }
  }
}

function getObjectValueByPath(path: string, obj: object) {
  return path.split('.').reduce((prev: any, curr: any) => {
    return prev ? prev[curr] : null
  }, obj || self)
}

function returnTotalString(this: any, data: any) {
  return 'Total'
}

function countTotalTable(this: any, data: any) {
  return data.map((row: any) => {
    return + getObjectValueByPath(this.field, row);
  }).reduce((sum: any, i: any) => {
    return sum + i;
  }, 0);
}

function formatNumberFiatTableTotal(this: any, data: any) {
  return formatNumber(countTotalTable.call(this, data), 2, '$')
}

function formatNumberBTCTotalTable(this: any, data: any) {
  return formatNumber(countTotalTable.call(this, data), 9)
}

function formatNumberCoinTotalTable(this: any, data: any) {
  return formatNumber(countTotalTable.call(this, data), 9, COIN_SYMBOL)
}

// Home page - Functions
function updateLayoutMarketBoxes() {
  const link = 'https://api.coingecko.com/api/v3/simple/price?ids=' + COINGECKO_SYMBOL + '&vs_currencies=usd%2Cbtc&include_market_cap=true&include_24hr_vol=true';
  $.get(link, (data, textStatus, jqXHR) => {
    $('#layoutBTCPrice').text(formatNumberBTC(data[COINGECKO_SYMBOL].btc));
    $('#layoutUSDPrice').text(formatNumberFiat(data[COINGECKO_SYMBOL].usd));
    $('#layoutMarketCap').text(formatNumberFiat(data[COINGECKO_SYMBOL].usd_market_cap));
  });

  $.get('/rest/api/1/rpc/getmininginfo', (data, textStatus, jqXHR) => {
    if (COIN_TYPE === 'PoW')
      $('#layoutNetworkHash').text(formatNumber(data['nethashrate (kH/m)'], 2, 'kH/m'));
    if (COIN_TYPE === 'PoST')
      $('#layoutNetworkHash').text(formatNumberPercentage(Number(data.stakeinterest)));
  });

  if (COIN_TYPE === 'PoW')
    $.get('/rest/api/1/rpc/getblockchaininfo', (data, textStatus, jqXHR) => {
      $('#layoutSupply').text(formatNumberCoin(data.totalsupply));
    });
}

function homeBlocks(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/block?limit=100',
    success: (data) => {
      // Check for notification
      if (data[0] !== undefined) homeBlocksCheckNew(data[0].height);

      params.success({
        'rows': data,
        'total': data.length
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
    createNotification('New block ' + blockHeight + ', previous: ' + currentBlock);
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
    type: 'GET',
    url: '/rest/api/1/transaction?limit=100',
    success: (data) => {
      // As we want only the first Block, change the Blocks[] to Block
      const newData: any[] = [];
      data.forEach((row: any) => {
        row.block = row.blocks[0];
        delete row.blocks;
        newData.push(row);
      });
      params.success({
        'rows': newData,
        'total': newData.length
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
    type: 'GET',
    url: '/rest/api/1/extraction?limit=100',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
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

function homePeers(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/peer',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homePeersAddNodeButton(value: string) {
  const link = '<button onclick="homePeersAddNodeModal(' + value + ')" class="button is-small">AddNode</button>';
  return link;
}

function homePeersAddNodeModal(version: number) {
  $.get('/rest/api/1/peer/' + version, (data, textStatus, jqXHR) => {
    let peersList: string = '';
    $('#homePeersModal').toggleClass('is-active');
    $('#homePeersModalTitle').text(data.subVersion);
    for (const peer of data.peers) {
      peersList += '<p>addnode=' + peer.ip + (peer.port !== null ? ':' + peer.port : '') + '</p>';
    }
    $('#homePeersPre').html(peersList);
  });
}

function homeRichList(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/address?limit=100',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function homeRichListAddressLink(value: string, row: any) {
  const link = '<a href="/address/' + value + '">' + (row.label !== null ? row.label : value) + '</a>';
  return addOverflowControl(link);
}

function homeMarket(params: any) {
  const link = 'https://api.coingecko.com/api/v3/coins/' + COINGECKO_SYMBOL + '/tickers?id=' + COINGECKO_SYMBOL;
  $.ajax({
    type: 'GET',
    url: link,
    success: (data) => {
      params.success({
        'rows': data.tickers,
        'total': data.tickers.length
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

interface ChartConfiguration {
  ctx: CanvasRenderingContext2D,
  chartType: Chart.ChartType,
  labelsArray: string[],
  datasets: {
    label: string,
    data: number[],
    color: string,
    yAxisID: string
  }[],
  scalesYAxes?: {
    type: string,
    display: boolean,
    position: string,
    id: string,
    ticks?: any,
    gridLines?: {
      drawOnChartArea: boolean,
    },
  }[]
}

function createChart(chartConfiguration: ChartConfiguration) {
  const datasetsArray = [];
  const scalesYAxes: any[] = [];
  for (const dataset of chartConfiguration.datasets) {
    datasetsArray.push(
      {
        label: dataset.label,
        pointRadius: 0,
        data: dataset.data,
        backgroundColor: dataset.color,
        borderWidth: 1,
        yAxisID: dataset.yAxisID,
      },
    )
  }
  if (chartConfiguration.scalesYAxes !== undefined) {
    for (const scalesYAxe of chartConfiguration.scalesYAxes) {
      const data: any = {
        type: scalesYAxe.type,
        display: scalesYAxe.display,
        position: scalesYAxe.position,
        id: scalesYAxe.id,
      }
      if (Object.keys(scalesYAxe.ticks).length !== 0) {
        data.ticks = scalesYAxe.ticks
      }
      if (scalesYAxe.gridLines !== undefined) {
        data.gridLines = scalesYAxe.gridLines;
      }
      scalesYAxes.push(data);
    }
  }
  const defaultYAxes = [{
    type: 'linear',
    display: true,
    position: 'left',
    id: 'y-axis-1',
  }, {
    type: 'linear',
    display: true,
    position: 'right',
    id: 'y-axis-2',
    gridLines: {
      drawOnChartArea: false,
    },
  }];
  const scales: Chart.TimeScale = {
    xAxes: [{
      type: 'time',
      display: true,
      time: {
        tooltipFormat: 'DD MMM YYYY',
      }
    }],
    yAxes: scalesYAxes.length === 0 ? defaultYAxes : scalesYAxes
  }
  myChart = new Chart(chartConfiguration.ctx, {
    type: chartConfiguration.chartType,
    data: {
      labels: chartConfiguration.labelsArray,
      datasets: datasetsArray,
    },
    options: {
      maintainAspectRatio: false,
      scales: chartConfiguration.chartType === 'pie' ? undefined : scales,
      plugins: {
        zoom: {
          zoom: {
            enabled: true,
            drag: true,
            mode: 'x',
            speed: 0.1,
            threshold: 2,
            sensitivity: 3,
          }
        }
      }
    }
  });
}

function homeCharts(chart: string) {
  // Variables
  if (myChart !== undefined) {
    myChart.destroy();
  }
  const chartCtx = (document.getElementById('myChart')! as HTMLCanvasElement).getContext('2d')!;

  switch (chart) {
    case 'circulation': {
      $.get('/rest/api/1/chart/circulation', (data, textStatus, jqXHR) => {
        const time = [];
        const amounts = [];
        const generations = [];
        const inflations = [];

        for (const row of data) {
          time.push(row.time);
          amounts.push(row.amount);
          generations.push(row.generation);
          inflations.push(row.inflation);
        }

        const chartConfiguration: ChartConfiguration = {
          ctx: chartCtx,
          chartType: 'line',
          labelsArray: time,
          datasets: [
            {
              label: 'Inflation',
              data: inflations,
              color: 'rgba(54, 162, 235, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Circulation',
              data: amounts,
              color: 'rgba(255, 99, 132, 0.2)',
              yAxisID: 'y-axis-2'
            },
            {
              label: 'Generation',
              data: generations,
              color: 'rgba(35,43,43, 0.2)',
              yAxisID: 'y-axis-2'
            },
          ]
        }
        createChart(chartConfiguration);
      });
      break;
    }
    case 'difficulty': {
      $.get('/rest/api/1/chart/difficulty', (data, textStatus, jqXHR) => {
        const time = [];
        const blocks = [];
        const difficulty = [];
        const transactions = [];

        for (const row of data) {
          time.push(row.time);
          blocks.push(row.blocks);
          difficulty.push(row.difficulty);
          transactions.push(row.transactions);
        }

        const chartConfiguration: ChartConfiguration = {
          ctx: chartCtx,
          chartType: 'line',
          labelsArray: time,
          datasets: [
            {
              label: 'Difficulty',
              data: difficulty,
              color: 'rgba(255, 99, 132, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Blocks',
              data: blocks,
              color: 'rgba(35,43,43, 0.2)',
              yAxisID: 'y-axis-2'
            },
            {
              label: 'Transactions',
              data: transactions,
              color: 'rgba(54, 162, 235, 0.2)',
              yAxisID: 'y-axis-2'
            },
          ]
        }
        createChart(chartConfiguration);
      });
      break;
    }
    case 'blockchainSize': {
      $.get('/rest/api/1/chart/blockchainSize', (data, textStatus, jqXHR) => {
        const time = [];
        const sizes = [];
        const avgBlockSizes = [];
        const avgTransactions = [];

        for (const row of data) {
          time.push(row.time);
          sizes.push(row.size);
          avgBlockSizes.push(row.avgblocksize);
          avgTransactions.push(row.avgtransactions);
        }

        const chartConfiguration: ChartConfiguration = {
          ctx: chartCtx,
          chartType: 'line',
          labelsArray: time,
          datasets: [
            {
              label: 'Blockchain size',
              data: sizes,
              color: 'rgba(255, 99, 132, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Avg block size',
              data: avgBlockSizes,
              color: 'rgba(35,43,43, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Avg transactions per block',
              data: avgTransactions,
              color: 'rgba(54, 162, 235, 0.2)',
              yAxisID: 'y-axis-2'
            },
          ]
        }
        createChart(chartConfiguration);
      });
      break;
    }
    case 'transactionVolume': {
      $.get('/rest/api/1/chart/transactionVolume', (data, textStatus, jqXHR) => {
        const time = [];
        const volumes = [];
        const avgAmounts = [];
        const avgFees = [];

        for (const row of data) {
          time.push(row.time);
          volumes.push(row.volume);
          avgAmounts.push(row.avgAmount);
          avgFees.push(row.avgFee);
        }

        const chartConfiguration: ChartConfiguration = {
          ctx: chartCtx,
          chartType: 'line',
          labelsArray: time,
          datasets: [
            {
              label: 'Volume',
              data: volumes,
              color: 'rgba(255, 99, 132, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Avg output',
              data: avgAmounts,
              color: 'rgba(35,43,43, 0.2)',
              yAxisID: 'y-axis-1'
            },
            {
              label: 'Avg Fee',
              data: avgFees,
              color: 'rgba(54, 162, 235, 0.2)',
              yAxisID: 'y-axis-2'
            },
          ],
          scalesYAxes: [{
            type: 'logarithmic',
            display: true,
            position: 'left',
            ticks: {
              autoSkip: true,
              maxTicksLimit: 8.1,
              callback: (value: any, index: any, values: any) => {
                return value;
              }
            },
            id: 'y-axis-1',
          }, {
            type: 'linear',
            display: true,
            position: 'right',
            id: 'y-axis-2',
            ticks: {},
            gridLines: {
              drawOnChartArea: false,
            },
          }],
        }
        createChart(chartConfiguration);
      });
      break;
    }
    default: {
      break;
    }
  }
}

// Block page - Functions
function blockTransactions(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/block/' + getUrlParameter() + '/transactions',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
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
  if (row.vin === null || row.vin === undefined) {
    return '';
  } else if (row.vin.vout === null || row.vin.vout === undefined) {
    return '<p class="has-text-primary">Coinbase</p>'
  } else {
    return addOverflowControl('<a href="/address/' + row.vin.vout.addresses[0].address + '">' + row.vin.vout.addresses[0].address + '</a>');
  }
}

function blockTransactionsVout(value: string, row: any) {
  if (row.vout === null || row.vout === undefined) {
    return '';
  } else {
    return addOverflowControl('<a href="/address/' + row.vout.addresses[0].address + '">' + row.vout.addresses[0].address + '</a></span>');
  }
}

// Transaction page - Functions
function transactionVinPrevious(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined && row.vout !== null && row.vout !== undefined) {
    return addOverflowControl(
      '<span>' + row.vout.n + ': <a href="/transaction/' + row.vout.transaction.txid + '">' + row.vout.transaction.txid + '</a></span>');
  } else {
    return '<p class="has-text-primary">N/A</p>';
  }
}

function transactionVinAddress(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined && row.vout !== null && row.vout !== undefined) {
    return addOverflowControl('<a href="/address/' + row.vout.addresses[0].address + '">' + row.vout.addresses[0].address + '</a>')
  } else {
    return '<p class="has-text-primary">Coinbase</p>';
  }
}

function transactionVinAmount(value: string, row: any) {
  if (row.vout !== null && row.vout !== undefined && row.vout !== null && row.vout !== undefined) {
    return '<p>' + row.vout.value + '</p>';
  } else {
    return '<p class="has-text-primary">N/A</p>';
  }
}

function transactionVoutRedeemed(value: string, row: any) {
  if (row.vins[0] !== null && row.vins[0] !== undefined) {
    return addOverflowControl('<a href="/transaction/' + row.vins[0].transaction.txid + '">' + row.vins[0].transaction.txid + '</a>');
  } else {
    return '<p class="has-text-primary">Not yet redeemed</p>';
  }
}

function transactionVoutAddress(value: string, row: any) {
  return addOverflowControl('<a href="/address/' + row.addresses[0].address + '">' + row.addresses[0].address + '</a></span>');
}

function transactionBlockLink(value: string, row: any) {
  return '<a href="/block/' + row.hash + '">' + value + '</a>';
}

// Address page - Functions
function addressTransactions(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/address/' + getUrlParameter() + '/transactions?limit=100',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
      })
    },
    error: (err) => {
      params.error(err);
    }
  });
}

function addressTransactionsTransaction(value: string, row: any) {
  const nVout = row.vout_n !== null && row.vinvout_value === null ? '<span>' + row.vout_n + ': </span>' : '';
  const link = nVout + '<a href="/transaction/' + value + '">' + value + '</a>';
  return addOverflowControl(link);
}

function addressTransactionsBlock(value: string, row: any) {
  return '<a href="/block/' + row.block_hash + '">' + row.block_height + '</a>';
}

function addressTransactionsValue(value: string, row: any) {
  const vinValue = row.vinvout_value !== null ?
    formatNumberCoin(-row.vinvout_value) : undefined;
  const voutValue = row.vout_value !== null ?
    formatNumberCoin(row.vout_value) : undefined;
  const bothValue = row.vinvout_value !== null && row.vout_value !== null ?
    formatNumberCoin(-(row.vinvout_value-row.vout_value)) : undefined;
  if (bothValue !== undefined) {
    return bothValue + ' <b>*</b>';
  } else if (vinValue !== undefined) {
    return vinValue;
  } else {
    return voutValue;
  }
}

// Extraction page - Functions
function extractionBlocks(params: any) {
  $.ajax({
    type: 'GET',
    url: '/rest/api/1/extraction/' + getUrlParameter() + '?limit=100',
    success: (data) => {
      params.success({
        'rows': data,
        'total': data.length
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
$(() => {

  // Layout: Search
  $('#layoutSearch').on('keypress', (e) => {
    if (e.key === 'Enter') {
      $.get('/rest/api/1/general?search=' + $('#layoutSearch').val(), (data, textStatus, jqXHR) => {
        if (data.length === 1) {
          window.location.replace('/' + data[0].type + '/' + data[0]._id);
        }
      });
    }
  });

  // Layout: Menu
  $('.navbar-burger').on('click', () => {
    $('.navbar-burger').toggleClass('is-active');
    $('.navbar-menu').toggleClass('is-active');
  });

  $('div.navbar-item').on('click', function (e: any) {
    // Dropdown button
    if ($(e.target).hasClass('navbar-link')) {
      $('div.navbar-item').each(function () {
        $(this).removeClass('is-active')
      });
      $(this).toggleClass('is-active');
    }
  });

  // Page specific : Home
  if ($(location).attr('pathname') === '/') {

    // Direct link with anchor
    const hash = window.location.hash;
    if (hash !== '') {
      navigationControl(hash + 'Div');
    } else {
      navigationControl('#homeBlocksDiv');
    }

    // OnClick select the good div
    $('a.navbar-item').on('click', function (e: any) {
      // Get div content
      const contentHash = $(this).attr('href')!.substr(1)
      navigationControl(contentHash + 'Div');
      // Close menu
      $('div.navbar-item').each(function () {
        $(this).removeClass('is-active')
      });
      $('.navbar-burger').removeClass('is-active');
      $('.navbar-menu').removeClass('is-active');
    });

    // Push TX
    $('#homePushTxButton').on('click', () => {
      const hex: string = String($('#homePushTxHex').val());
      if (hex !== '') {
        $.get('/rest/api/1/rpc/sendrawtransaction/' + hex, (data, textStatus, jqXHR) => {
          alert(data)
        })
          .fail(() => {
            alert('You request was rejected by the blockchain');
          });
      }
    });

    // Decode TX
    $('#homeDecodeTxButton').on('click', () => {
      const hex: string = String($('#homeDecodeTxHex').val());
      $.get('/rest/api/1/rpc/decoderawtransaction/' + hex, (data, textStatus, jqXHR) => {
        $('#homeDecodeTxModalPre').html(formatJSON(JSON.stringify(data, undefined, 2)));
        $('#homeDecodeTxModal').toggleClass('is-active');
      })
        .fail(() => {
          alert('You request was rejected by the blockchain');
        });
    });

    $('#homeDecodeTxModalClose').on('click', () => {
      $('#homeDecodeTxModal').toggleClass('is-active');
    });

    // Peers
    $('#homePeersModalClose').on('click', () => {
      $('#homePeersModal').toggleClass('is-active');
    });

    // Charts
    $("#homeChartSelect").on('change', function () {
      const chartType = String($(this).val());
      homeCharts(chartType);
    });

    $('#homeChartResetZoom').on('click', () => {
      (myChart as any).resetZoom();
    })

    // Page initialization
    updateLayoutMarketBoxes();
    homeCharts('circulation');

    // Auto refresh
    setInterval(
      updateLayoutMarketBoxes,
      60000
    );
  }

  // Page specific : Block
  if ($(location).attr('pathname')!.indexOf('/block') === 0) {
    const allItemInfo = ['#blockTransactionsDiv', '#blockJSONDiv'];

    $('#blockTransactions').on('click', () => {
      tabsControl('#blockTransactions', '#blockTransactionsDiv', allItemInfo);
      $.get('/rest/api/1/block/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#blockHeight').text('"' + data.height + '"');
        $.get('/rest/api/1/block/' + getUrlParameter() + '/confirmations', (confirmations) => {
          const iIcon = $('<i></i>').addClass('fas fa-check');
          const spanIcon = $('<span></span>').addClass('icon ml-1').append(iIcon);
          if (data.chain.id === 1 && confirmations.confirmations >= COIN_CONFIRMATIONS) {
            $('#blockConfirmation').text(formatNumber(confirmations.confirmations, 0)).addClass('is-success').append(spanIcon);
          } else if (data.chain.id === 1 && confirmations.confirmations < COIN_CONFIRMATIONS) {
            $('#blockConfirmation').text(formatNumber(confirmations.confirmations, 0)).addClass('is-warning').append(spanIcon);
          } else {
            $('#blockConfirmation').text('Rejected').addClass('is-danger');
          }
        });
        $('#blockHash').text(data.hash);
        $('#blockTime').text(formatEpochToDate(data.time));
        $('#blockTransactionsCount').text(data.nTx);
        $('#blockSize').text(' ( ' + formatBytes(data.size) + ' )');
        $('#blockInputs').text(data.inputC);
        $('#blockIn').text(' ( ' + formatNumberCoin(data.inputT) + ' )');
        $('#blockOutputs').text(data.outputC);
        $('#blockOut').text(' ( ' + formatNumberCoin(data.outputT) + ' )');
        $('#blockFees').text(formatNumberCoin(data.feesT));
        $('#blockDifficulty').text(formatNumberDifficulty(data.difficulty));
        $('#blockGeneration').text(formatNumberCoin(data.generation));
        $('#blockMiner').attr('href', '/extraction/' + data.miner.address);
        $('#blockMiner').text(data.miner.label !== null ? data.miner.label : data.miner.address);
      });
    });

    $('#blockJSON').on('click', () => {
      tabsControl('#blockJSON', '#blockJSONDiv', allItemInfo);
      $.get('/rest/api/1/rpc/getblock/' + getUrlParameter() + '?verbosity=2', (data, textStatus, jqXHR) => {
        $('#blockJSONDiv').children().html(formatJSON(JSON.stringify(data, undefined, 2)));
      });
    });

    // Page initialization
    $('#blockTransactions').trigger('click');
  }

  // Page specific : Transaction
  if ($(location).attr('pathname')!.indexOf('/transaction') === 0) {

    const allItemInfo = ['#transactionVinsDiv', '#transactionVoutsDiv', '#transactionHistoryDiv', '#transactionJSONDiv'];

    function getTransaction() {
      $.get('/rest/api/1/transaction/' + getUrlParameter(), (data, textStatus, jqXHR) => {
        $('#transactionId').text(data.txid);
        if (data.blocks !== null) {
          $('#transactionBlock').text(data.blocks[0].height);
          $('#transactionBlock').attr('href', '/block/' + data.blocks[0].hash);
          $.get('/rest/api/1/block/' + data.blocks[0].hash + '/confirmations', (confirmations) => {
            const iIcon = $('<i></i>').addClass('fas fa-check');
            const spanIcon = $('<span></span>').addClass('icon ml-1').append(iIcon);
            if (data.blocks[0].chain.id === 1 && confirmations.confirmations >= COIN_CONFIRMATIONS) {
              $('#transactionConfirmation').text(formatNumber(confirmations.confirmations, 0)).addClass('is-success').append(spanIcon);
            } else if (data.blocks[0].chain.id === 1 && confirmations.confirmations < COIN_CONFIRMATIONS) {
              $('#transactionConfirmation').text(formatNumber(confirmations.confirmations, 0)).addClass('is-warning').append(spanIcon);
            } else {
              $('#transactionConfirmation').text('Rejected').addClass('is-danger');
            }
          });
        } else {
          $('#transactionBlock').text('MemPool');
          $('#transactionConfirmation').text('MemPool').addClass('is-info');
        }
        $('#transactionTime').text(formatEpochToDate(data.time));
        $('#transactionSize').text(formatBytes(data.size));
        $('#transactionInputs').text(data.inputC);
        $('#transactionIn').text(' ( ' + formatNumberCoin(data.inputT) + ' )');
        $('#transactionOutputs').text(data.outputC);
        $('#transactionOut').text(' ( ' + formatNumberCoin(data.outputT) + ' )');
        $('#transactionFee').text(formatNumberCoin(data.fee));

        ($('#transactionVinsTable') as any).bootstrapTable({
          data: {
            'rows': data.vins,
            'total': data.vins.length
          }
        });
        ($('#transactionVoutsTable') as any).bootstrapTable({
          data: {
            'rows': data.vouts,
            'total': data.vouts.length
          }
        })
        if (data.blocks.length > 1) {
          $('#transactionHistory').parent().removeClass('is-hidden');
        }
        ($('#transactionHistoryTable') as any).bootstrapTable({
          data: {
            'rows': data.blocks,
            'total': data.blocks.length
          }
        })
      });
    }

    $('#transactionVins').on('click', () => {
      tabsControl('#transactionVins', '#transactionVinsDiv', allItemInfo);
    });

    $('#transactionVouts').on('click', () => {
      tabsControl('#transactionVouts', '#transactionVoutsDiv', allItemInfo);
    });

    $('#transactionHistory').on('click', () => {
      tabsControl('#transactionHistory', '#transactionHistoryDiv', allItemInfo);
    });

    $('#transactionJSON').on('click', () => {
      tabsControl('#transactionJSON', '#transactionJSONDiv', allItemInfo);
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
    $('#extractionAddress').text(getUrlParameter());
    $('#extractionAddress').attr('href', '/address/' + getUrlParameter());
  }

  // Page specific : FAQ
  if ($(location).attr('pathname')!.indexOf('/faq') === 0) {
    // Toggle div when from an anchor
    const hash = window.location.hash;
    if (hash !== '') {
      $(hash).toggle();
    }

    $('#financial-disclaimer').on('click', () => {
      $('#financial-disclaimer-content').toggle();
    });
  }
});