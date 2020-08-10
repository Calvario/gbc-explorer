$(document).ready(function() {

	// General functions
	function formatBytes(a, b = 2) {
		if (0 === a) return "0 B";
		const c = 0 > b ? 0 : b,
			d = Math.floor(Math.log(a) / Math.log(1024));
		return parseFloat((a / Math.pow(1024, d)).toFixed(c)) + " " + ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
	}

	function formatEpochToAge(epoch) {
		var epochDate = new Date(epoch * 1000).getTime();

		var now = new Date().getTime();
		var distance = now - epochDate;

		var days = Math.floor(distance / (1000 * 60 * 60 * 24));
		var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		var seconds = Math.floor((distance % (1000 * 60)) / 1000);

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

	function formatEpochToDate(epoch){

		var date = new Date(epoch * 1000);

		var year = date.getFullYear();
		var month = date.toLocaleString('default', { month: 'short' });
		var day = ("0" + date.getDate()).substr(-2);
		var hours = ("0" + date.getHours()).substr(-2);
		var minutes = ("0" + date.getMinutes()).substr(-2);
		var seconds = ("0" + date.getSeconds()).substr(-2);

		var convdataTime = day + ' ' + month + ' ' + year
			+ ' '+ hours + ':' + minutes + ':' + seconds + '';

		return convdataTime;
	}

	function formatNumber(number, size = 5) {
		const options = {
			minimumFractionDigits: size,
			maximumFractionDigits: size
		};
		return new Number(number).toLocaleString('en', options);
	}

	function formatJSON(json) {
		if (typeof json != 'string') {
			 json = JSON.stringify(json, undefined, 2);
		}
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
			var cls = 'json-number';
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

	function formatTableDataLabel(id) {
		$(id + ' th').each(function(i,elem) {
			var num = i + 1;
			$('table td:nth-child(' + num + ')').attr('data-label', $(elem).text());
		});
	}

	function getUrlParameter() {
    const pathname = window.location.pathname;
		return pathname.substring(pathname.lastIndexOf('/') + 1);
	};

	function navigationControl(menuItem, itemInfo, allItemInfo = [], refresh = false){
		$("li").each(function() {
			$(this).removeClass("is-active");
		});

		// Hide all
		allItemInfo.forEach(function(element) {
			$(element).parent().addClass("is-hidden");
		});

		// Set active menu
		$(menuItem).parent().addClass('is-active');

		// Remove hidden
		$(itemInfo).parent().removeClass('is-hidden');

		// Async auto refresh
		if (refresh === true) {
			sessionStorage.setItem('homeCurrentTab', menuItem);
		}
	}

	function createNotification(message) {
		if (location.protocol === 'https:') {
			if (!("Notification" in window)) {
				alert("This browser does not support desktop notification");
			} else if (Notification.permission === "granted") {
				new Notification(message);
			} else if (Notification.permission !== "denied") {
				Notification.requestPermission().then(function (permission) {
					if (permission === "granted") {
						new Notification(message);
					}
				});
			}
		}
	}

	// Layout : Functions
	$('#layoutSearch').keypress(function(e){
        if(e.which == 13) {
			$.get('/rest/api/1/general?search=' + $('#layoutSearch').val(), function (data, textStatus, jqXHR) {
				if(data.length === 1) {
					window.location.replace('/' + data[0].type + '/' + data[0]._id);
				}
			});
		}
	});

	$(".navbar-burger").click(function() {
		$(".navbar-burger").toggleClass("is-active");
		$(".navbar-menu").toggleClass("is-active");
	});

	// Page specific : Home
	if ($(location).attr('pathname') === '/') {

		var allItemInfo = ['#homeBlocksTable', '#homeTransactionsTable',
			'#homeAddressesTable', '#homeMempoolTable', '#homeExtractionTable',
			'#homeMarketTable', '#homeNewsWidget'];

		function updateLayoutMarketBoxes() {
			var link =  "https://api.coingecko.com/api/v3/simple/price?ids=veriumreserve&vs_currencies=usd%2Cbtc&include_market_cap=true&include_24hr_vol=true";
			$.get(link, function (data, textStatus, jqXHR) {
				$('#layoutBTCPrice').text(data.veriumreserve.btc);
				$('#layoutUSDPrice').text(formatNumber(data.veriumreserve.usd, 2) + ' $');
				$('#layoutMarketCap').text(formatNumber(data.veriumreserve.usd_market_cap, 2) + ' $');
			});

			$.get('/rest/api/1/rpc/getmininginfo', function (data, textStatus, jqXHR) {
				$('#layoutNetworkHash').text(formatNumber(data["nethashrate (kH/m)"], 2) + ' kH/m');
			});

			$.get('/rest/api/1/rpc/getblockchaininfo', function (data, textStatus, jqXHR) {
				$('#layoutSupply').text(formatNumber(data.totalsupply, 0));
			});
		}

		function newBlockCheck(blockHeight) {
			if (sessionStorage.getItem('homeCurrentBlock') === null) {
				sessionStorage.setItem('homeCurrentBlock', blockHeight);
			} else if (Number(blockHeight) > Number(sessionStorage.getItem('homeCurrentBlock'))) {
				createNotification("New block " + blockHeight + ', previous: ' + sessionStorage.getItem('homeCurrentBlock'));
				sessionStorage.setItem('homeCurrentBlock', blockHeight);
			}
		}

		$('#homeBlocks').click(function(){
			navigationControl('#homeBlocks', "#homeBlocksTable", allItemInfo, true);
			$.get('/rest/api/1/block', function (data, textStatus, jqXHR) {
				// Clean tables
				$("#homeBlocksTable tbody tr").remove();
				// Check for notification
				if(data[0] !== undefined) { newBlockCheck(data[0].height); }
				// Async
				$.each(data, function(i, item) {
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
		});

		$('#homeTransactions').click(function(){
			navigationControl('#homeTransactions', "#homeTransactionsTable", allItemInfo, true);
			$.get('/rest/api/1/transaction', function (data, textStatus, jqXHR) {
				// Clean table
				$("#homeTransactionsTable tbody tr").remove();
				$.each(data, function(i, item) {
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
		});

		$('#homeAddresses').click(function(){
			navigationControl('#homeAddresses', "#homeAddressesTable", allItemInfo, true);
			$.get('/rest/api/1/address', function (data, textStatus, jqXHR) {
				// Clean table
				$("#homeAddressesTable tbody tr").remove();
				$.each(data, function(i, item) {
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
		});

		$('#homeMempool').click(function(){
			navigationControl('#homeMempool', "#homeMempoolTable", allItemInfo);
		});

		$('#homeExtraction').click(function(){
			navigationControl('#homeExtraction', "#homeExtractionTable", allItemInfo, true);
			$.get('/rest/api/1/extraction', function (data, textStatus, jqXHR) {
				// Clean table
				$("#homeExtractionTable tbody tr").remove();
				$.each(data, function(i, item) {
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
		});

		$('#homeMarket').click(function(){
			navigationControl('#homeMarket', "#homeMarketTable", allItemInfo);
			var link =  "https://api.coingecko.com/api/v3/coins/veriumreserve/tickers?id=veriumreserve";
			$.get(link, function (data, textStatus, jqXHR) {
				// Clean table
				$("#homeMarketTable tbody tr").remove();
				$.each(data.tickers, function(i, item) {
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
		});

		$('#homeNews').click(function(){
			navigationControl('#homeNews', "#homeNewsWidget", allItemInfo);
		});

		// Page initialization
		updateLayoutMarketBoxes();
		$("#homeBlocks").trigger('click');

		// Auto refresh
		setInterval(function(){
			$(sessionStorage.getItem('homeCurrentTab')).trigger('click');
		}, 30000);
		setInterval(
			updateLayoutMarketBoxes
		, 60000);
	}

	// Page specific : Block
	if ($(location).attr('pathname').indexOf('/block') === 0) {
		var allItemInfo = ['#blockTransactionsTable', '#blockJSONPre'];

		$('#blockTransactions').click(function(){
			$.get('/rest/api/1/block/' + getUrlParameter(), function (data, textStatus, jqXHR) {
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

      $.get('/rest/api/1/block/' + getUrlParameter() + '/transactions', function (data, textStatus, jqXHR) {
        navigationControl('#blockTransactions', '#blockTransactionsTable', allItemInfo);
				$("#blockTransactionsTable tbody tr").remove();
				$.each(data, function(i, item) {
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
							$.map(item.vins, function(vin, i) {
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
							$.map(item.vouts, function(vout, i) {
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

		$('#blockJSON').click(function(){
			navigationControl('#blockJSON', '#blockJSONPre', allItemInfo);
			$.get('/rest/api/1/rpc/getblock/' + getUrlParameter() + '?verbosity=2', function (data, textStatus, jqXHR) {
				$('#blockJSONPre').html(formatJSON(JSON.stringify(data, undefined, 2)));
			});
		});

		// Page initialization
		$("#blockTransactions").trigger('click');
	}

	// Page specific : Transaction
	if ($(location).attr('pathname').indexOf('/transaction') === 0) {

		var allItemInfo = ['#transactionVinsTable', '#transactionVoutsTable', '#transactionJSONPre'];

		function getTransaction() {
			$.get('/rest/api/1/transaction/' + getUrlParameter(), function (data, textStatus, jqXHR) {
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
				$.each(data.vins, function(i, item) {
					$('<tr>').append(
						$('<td class="has-text-right">').text(i),
						$('<td class="has-text-left-desktop">').append(
							function() {
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
							function() {
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
							function() {
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
				$.each(data.vouts, function(i, item) {
					$('<tr>').append(
						$('<td class="has-text-right">').text(item.n),
						$('<td class="has-text-left-desktop">').append(
							function() {
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

		$('#transactionVins').click(function(){
			navigationControl('#transactionVins', '#transactionVinsTable', allItemInfo);
		});

		$('#transactionVouts').click(function(){
			navigationControl('#transactionVouts', '#transactionVoutsTable', allItemInfo);
		});

		$('#transactionJSON').click(function(){
			navigationControl('#transactionJSON', '#transactionJSONPre', allItemInfo);
			$.get('/rest/api/1/rpc/getrawtransaction/' + getUrlParameter() + '?verbose=true', function (data, textStatus, jqXHR) {
				$('#transactionJSONPre').html(formatJSON(JSON.stringify(data, undefined, 2)));
			});
		});

		// Page initialization
		getTransaction();
	}

	// Page specific : Address
	if ($(location).attr('pathname').indexOf('/address') === 0) {

		$.get('/rest/api/1/address/' + getUrlParameter(), function (data, textStatus, jqXHR) {
			$('#addressHash').text(data.address);
			$('#addressLabel').text(data.label);
			$('#addressBalance').text(formatNumber(data.balance));
			$('#addressTransactions').text(data.nTx);
			$('#addressInputs').text(data.inputC);
			$('#addressOutputs').text(data.outputC);
		});

		$("#addressTransactionsTable tbody tr").remove();
		$.get('/rest/api/1/address/' + getUrlParameter() + '/transactions', function (data, textStatus, jqXHR) {
			$.each(data, function(i, item) {
				// Received
				if (item.vouts[0].addresses[0].address === getUrlParameter()) {
					$('<tr>').append(
						$('<td class="has-text-left-desktop">').append(
							$('<span class="text-overflow-dynamic-container">').append(
								$('<span class="text-overflow-dynamic-ellipsis">').append(
									$('<span>').text(item.vouts[0].n + ': ').append(
										$('<a href="/transaction/' + item.hash + '">').text(item.hash)
									)
								)
							)
						),
						$('<td class="has-text-right">').append(
							$('<a href="/block/' + item.block.hash + '">').text(item.block.height)
						),
						$('<td class="has-text-right">').text(formatEpochToDate(item.block.time)),
						$('<td class="has-text-right">').text(formatNumber(item.vouts[0].value)),
					).appendTo('#addressTransactionsTable');

				// Sent
				} else if (item.vins[0].vout.addresses[0].address === getUrlParameter()) {
					$('<tr>').append(
						$('<td class="has-text-left-desktop">').append(
							$('<span class="text-overflow-dynamic-container">').append(
								$('<span class="text-overflow-dynamic-ellipsis">').append(
									$('<span>').text(item.vins[0].vout.n + ': ').append(
										$('<a href="/transaction/' + item.hash + '">').text(item.hash)
									)
								)
							)
						),
						$('<td class="has-text-right">').append(
							$('<a href="/block/' + item.block.hash + '">').text(item.block.height)
						),
						$('<td class="has-text-right">').text(formatEpochToDate(item.block.time)),
						$('<td class="has-text-right">').text(formatNumber(-item.vins[0].vout.value)),
					).appendTo('#addressTransactionsTable');

				// Should not happen
				} else {
					console.log("Please report this bug => Error with : " + JSON.stringify(item))
				}
			});
			formatTableDataLabel('#addressTransactionsTable');
		});
	}

	// Page specific : Extraction
	if ($(location).attr('pathname').indexOf('/extraction') === 0) {
		$("#extractionTable tbody tr").remove();
		$("#extractionAddress").text(getUrlParameter());
		$("#extractionAddress").attr("href", '/address/' + getUrlParameter());
		$.get('/rest/api/1/extraction/' + getUrlParameter(), function (data, textStatus, jqXHR) {
			$.each(data, function(i, item) {
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
});