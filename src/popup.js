'use strict';

import './popup.css';

// import xlsx 
import { writeFileXLSX } from "xlsx"

(function() {

  const domains = ['bridesblush.com', 'thefashionball.com', 'thedaddest.com', 'sneakertoast.com', 'instantlymodern.com', 'fabcrunch.com', 'drivepedia.com', 'cleverclassic.com', 'ballercap.com', 'bigglobaltravel.com'];
  // We will make use of Storage API to get and store `count` value
  // More information on Storage API can we found at
  // https://developer.chrome.com/extensions/storage

  // To get storage access, we have to mention it in `permissions` property of manifest.json file
  // More information on Permissions can we found at
  // https://developer.chrome.com/extensions/declare_permissions

  const saveButton = document.getElementById('saveBtn');
  const exportButton = document.getElementById('exportBtn');
  const clearButton = document.getElementById('clearBtn');
  const nameTextBox = document.getElementById('name');

  saveButton.addEventListener('click', saveArticles)
  clearButton.addEventListener('click', clearArticles)
  exportButton.addEventListener('click', exportArticles)


  // export to excel in the format: articles | headlines | campaigns
  function exportToExcel(articles, headlines, campaigns) {
    const table = []
    // create a table with the format: articles | headlines | campaigns
    for (let i = 0; i < articles.length; i++) {
      table.push([articles[i], headlines[i], campaigns[i]])
    }
    var XLSX = require('xlsx');

    const ws = XLSX.utils.aoa_to_sheet(table);
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    XLSX.utils.sheet_add_aoa(ws, table, { origin: "A1" });

    // set width to max width
    ws['!cols'] = [{ wch: 100 }, { wch: 100 }, { wch: 100 }]


    // create excel file and download it
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    }
    const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "articles.xlsx";
    link.click();


  }

  // export articles to excel
  function exportArticles() {
    // get articles, headlines, campaigns from storage
    chrome.storage.sync.get(['articles', 'headlines', 'campaigns'], function(result) {
      let masterSheet = {
        'articles': [],
        'headlines': [],
        'campaigns': []
      }

      if (result.articles) {
        masterSheet.articles = result.articles;
      }
      if (result.headlines) {
        masterSheet.headlines = result.headlines;
      }
      if (result.campaigns) {
        masterSheet.campaigns = result.campaigns;
      }

      exportToExcel(masterSheet.articles, masterSheet.headlines, masterSheet.campaigns);

    });
  }

  function parseCampaignNames(urls, name) {
    let campaignsJS = []
    for (const url of urls) {
      let campaignName = extractCampaignName(url, name);
      if (campaignName != null && campaignsJS.includes(campaignName) == false) {
        campaignsJS.push(campaignName);
      }
    }
    return campaignsJS;
  }

  function extractCampaignName(url, name) {
    const date = new Date().toLocaleString('default', { month: 'short' }) + new Date().getDate().toString().padStart(2, '0');
    const urlParts = url.split('/');
    for (let i = urlParts.length - 1; i >= 0; i--) {
      const part = urlParts[i];
      if (part.includes('-') && !part.startsWith('http')) {
        return `${part}-${name}-${date}`;
      }
    }
    return null;
  }


  // renders all articles to the article-container
  function render(articlesJS, name) {
    // if name is set
    const articleList = document.getElementById('article-list');
    if (name != "" && name != null) {
      nameTextBox.value = name;
    }

    articleList.innerHTML = ''
    for (const article in articlesJS) {
      const li = document.createElement('li');
      li.className = 'article-entry';
      li.innerHTML = articlesJS[article];
      articleList.appendChild(li);
    }
  }

  function saveArticles() {
    let name = nameTextBox.value;
    if (name == null || name == "") {
      alert("Please enter your name");
      return;
    }

    // check if existing articles are in storage
    chrome.storage.sync.get(['articles', 'headlines'], function(result) {
      let articlesJS = []
      let headlinesJS = []
      if (result.articles != null) {
        articlesJS = result.articles;
      }
      if (result.headlines != null) {
        headlinesJS = result.headlines;
      }
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        for (const tab of tabs) {
          if (domains.some((domain) => tab.url.includes(domain))) {
            if (articlesJS.includes(tab.url) == false) {
              articlesJS.push(tab.url);
              headlinesJS.push(tab.title);
            }
          }
        }
        // get campaign names from tab titles and save to storage
        const campaignsJS = parseCampaignNames(articlesJS, name);
        uploadCampaigns(campaignsJS);
        uploadHeadlines(headlinesJS);
        // save username to storage
        uploadName(name);
        // save articles to storage and render
        uploadArticles(articlesJS);
        render(articlesJS, name);
      });
    });
  }

  function uploadName(name) {
    chrome.storage.sync.set({ name: name }, function() {
    }
    );
  }

  function uploadHeadlines(headlines) {
    chrome.storage.sync.set({ headlines: headlines }, function() {
    }
    );
  }

  function uploadArticles(articlesJS) {
    chrome.storage.sync.set({ 'articles': articlesJS }, function() {
    });
  }

  function uploadCampaigns(campaignsJS) {
    chrome.storage.sync.set({ 'campaigns': campaignsJS }, function() {
      console.log('Campaigns saved');
    });
  }
  // download localstorage data to arrays
  function chromeDownload() {
    chrome.storage.sync.get(['articles', 'name'], function(result) {
      let articlesJS = [];
      let name = "";
      if (result.articles != null) {
        articlesJS = result.articles;
      }
      if (result.name != null) {
        name = result.name;
      }
      render(articlesJS, name);
    });
  }

  // download data before popup is opened
  window.addEventListener('load', chromeDownload);

  // empty localstorage
  function clearArticles() {
    chrome.storage.sync.clear();
    render([], "");
  }

})();
