// export to excel in the format: articles | headlines | campaigns
export function downloadExcel(articles, headlines, campaigns) {
  const table = [];
  // create a table with the format: articles | headlines | campaigns
  for (let i = 0; i < articles.length; i++) {
    table.push([articles[i], headlines[i], campaigns[i]]);
  }
  var XLSX = require('xlsx');

  const ws = XLSX.utils.aoa_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  XLSX.utils.sheet_add_aoa(ws, table, { origin: 'A1' });

  // set width to max width
  ws['!cols'] = [{ wch: 100 }, { wch: 100 }, { wch: 100 }];

  // create excel file and download it
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  return blob;
}

export function exportEntries(EntryList) {
  // create a table with the format: articles | headlines | campaigns | creatives 1 to 3
  const table = [];
  const unpushedEntries = [];

  EntryList.forEach((entry) => {
    // push the article, headline, campaign and creatives to the table
    // only push the entry if it has three creative
    if (entry.creatives == undefined || entry.creatives.length != 3) {
      unpushedEntries.push(entry);
    } else {
      table.push([
        entry.url,
        entry.headline,
        entry.campaign,
        entry.creatives[0],
        entry.creatives[1],
        entry.creatives[2],
      ]);
    }
  });

  var XLSX = require('xlsx');

  const ws = XLSX.utils.aoa_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  XLSX.utils.sheet_add_aoa(ws, table, { origin: 'A1' });

  // set width to max width
  ws['!cols'] = [
    { wch: 100 },
    { wch: 100 },
    { wch: 100 },
    { wch: 100 },
    { wch: 100 },
    { wch: 100 },
  ];

  // create excel file and download it
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  return {
    download_object: blob,
    unpushed_entries: unpushedEntries,
  };
}
