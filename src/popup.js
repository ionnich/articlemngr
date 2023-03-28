'use strict';

import './popup.css';
import * as data from './articles/domains.json';
import { downloadExcel, exportEntries } from './articles/articles.js';
import { parseCampaignNames, downloadToText } from './articles/campaigns.js';

(function () {
  class Entry {
    constructor(url, headline, campaign, creativeArr) {
      this.url = url;
      this.headline = headline;
      this.campaign = campaign;
      this.creatives = creativeArr;
    }
  }

  const domains = data.domains;
  const adheart = data.adheart;

  const saveButton = document.getElementById('saveBtn');
  const exportButton = document.getElementById('exportBtn');
  const clearButton = document.getElementById('clearBtn');
  const creativesButton = document.getElementById('creativesBtn');

  const nameTextBox = document.getElementById('name');

  saveButton.addEventListener('click', saveArticles);
  clearButton.addEventListener('click', clearArticles);
  exportButton.addEventListener('click', exportExcel);
  creativesButton.addEventListener('click', saveCreatives);

  async function exportArticles() {
    const exportvars = await chrome.storage.sync.get(['articles', 'headlines', 'campaigns']);
    const blob = downloadExcel(exportvars.articles, exportvars.headlines, exportvars.campaigns);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'articles.xlsx';
    link.click();
  }

  async function exportExcel() {
    const exportVars = await chrome.storage.sync.get([
      'articles',
      'headlines',
      'campaigns',
      'creatives',
    ]);

    const EntryList = bundleData(
      exportVars.articles,
      exportVars.headlines,
      exportVars.campaigns,
      exportVars.creatives
    );
    const entryquery = exportEntries(EntryList);

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(entryquery.download_object);
    link.download = 'entries.xlsx';
    link.click();

    if (entryquery.unpushed_entries.length > 0) {
      alert(
        'There are ' +
          entryquery.unpushed_entries.length +
          ' entries that were not exported. Please make sure that each entry has three creatives.'
      );
    }
  }

  function renderData(data, name) {
    const articleList = document.getElementById('article-list');
    nameTextBox.value = name;
    const creativeCounter = document.getElementById('creativesCtr');
    // const articleCount = 0;

    let creativeCount = 0;

    articleList.innerHTML = '';
    data.forEach((article, index) => {
      creativeCount += article.creatives.length;
      const table = document.createElement('table');
      table.className = 'table-entry';

      const row = table.insertRow(0);

      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      const cell3 = row.insertCell(2);

      cell1.innerHTML = index + 1;
      cell1.style.align = 'left';
      cell2.innerHTML =
        '<a style="text-decoration:none"  href="' +
        article.url +
        '" target="_blank">' +
        article.headline +
        '</a>';
      cell2.style.marginLeft = '10px';

      cell3.innerHTML = article.creatives.length;
      switch (article.creatives.length) {
        case 0:
          cell2.style.backgroundColor = 'red';
          break;
        case 1:
        case 2:
          cell2.style.backgroundColor = 'yellow';
          break;
        default:
          cell2.style.backgroundColor = 'green';
          break;
      }

      cell1.style.textAlign = 'left';
      cell3.style.align = 'right';

      articleList.appendChild(table);
    });
    creativeCounter.innerHTML = creativeCount;
  }

  function render(articlesJS, name) {
    const articleList = document.getElementById('article-list');
    nameTextBox.value = name;

    articleList.innerHTML = '';
    for (const article in articlesJS) {
      const li = document.createElement('li');
      li.className = 'article-entry';
      // inner html must be in the format aritcle | counter
      // just like:
      // https://www.nytimes.com/2020/10/01/us/politics/trump-biden-debate.html | 1
      li.innerHTML = `${article} | ${articlesJS[article]}`;
      // li.innerHTML = articlesJS[article];
      articleList.appendChild(li);
    }
  }

  function bundleData(urls, headlines, campaigns, creatives) {
    const entryList = [];
    let lastCreative = 0;
    urls.forEach((url, index) => {
      // each article has 3 creatives
      // the next article wont have creatives until the previous article has 3 creatives
      // so we need to keep track of the last creative index
      // and increment it by 3 for the next article
      const creativeArr = creatives.slice(lastCreative, lastCreative + 3);
      lastCreative += 3;
      const entry = new Entry(url, headlines[index], campaigns[index], creativeArr);
      entryList.push(entry);
    });

    return entryList;
  }

  async function saveCreatives() {
    let MAX_CREATIVES = 3;

    const creativesQuery = await chrome.storage.sync.get(['creatives']);
    const articlesQuery = await chrome.storage.sync.get(['articles']);

    let creatives = creativesQuery.creatives ? creativesQuery.creatives : [];
    let articles = articlesQuery.articles ? articlesQuery.articles : {};

    if (articles != undefined) {
      MAX_CREATIVES = articles.length * 3;
    }

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      for (const tab of tabs) {
        if (adheart.some((domain) => tab.url.includes(domain))) {
          // add tab url to creatives
          if (creatives.length < MAX_CREATIVES) {
            creatives.push(tab.url);
          }
        }
      }

      chrome.storage.sync.set({ creatives: creatives }, () => {
        console.log('creatives saved');
      });
    });
  }

  async function saveArticles() {
    let name = nameTextBox.value;
    if (name == null || name == '') {
      alert('Please enter your name');
      return;
    }

    const articleQuery = await chrome.storage.sync.get(['articles']);
    const headlineQuery = await chrome.storage.sync.get(['headlines']);

    let articles = articleQuery.articles ? articleQuery.articles : [];
    let headlines = headlineQuery.headlines ? headlineQuery.headlines : [];

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      let WARNING_FLAG = false;
      for (const tab of tabs) {
        if (domains.some((domain) => tab.url.includes(domain))) {
          if (!articles.includes(tab.url)) {
            articles.push(tab.url);
            headlines.push(tab.title);
          } else if (!WARNING_FLAG) {
            WARNING_FLAG = true;
            alert('You have already saved this article');
          }
        }
      }

      const campaigns = parseCampaignNames(articles, name);

      // create a text file containing all campaigns
      const campaignsBlob = downloadToText(campaigns);

      // download the blob
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(campaignsBlob);
      link.href = url;
      link.download = 'campaigns.txt';
      link.click();

      chrome.storage.sync.set(
        { articles: articles, headlines: headlines, campaigns: campaigns, name: name },
        function () {
          console.log('Articles saved');
        }
      );
    });
  }

  function sync() {
    chrome.storage.sync.get(
      ['articles', 'headlines', 'campaigns', 'creatives', 'name'],
      function (result) {
        let headlines = [];
        let urls = [];
        let creatives = [];
        let campaigns = [];
        let name = '';
        if (result.headlines != null) {
          headlines = result.headlines;
        }
        if (result.campaigns != null) {
          campaigns = result.campaigns;
        }
        if (result.name != null) {
          name = result.name;
        }
        if (result.creatives != null) {
          creatives = result.creatives;
        }
        if (result.articles != null) {
          urls = result.articles;
        }
        const data = bundleData(urls, headlines, campaigns, creatives);
        renderData(data, name);
      }
    );
  }

  // function chromeDownload() {
  //   sync();
  // }

  // add event listener to storage for changes
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      if (key == 'headlines' || key == 'articles' || key == 'creatives') {
        // get new data
        sync();
      }
    }
  });

  // empty localstorage
  function clearArticles() {
    chrome.storage.sync.set(
      { creatives: [], articles: [], headlines: [], campaigns: [], name: '' },
      function () {
        nameTextBox.value = '';
        console.log('Cleared articles');
      }
    );
  }

  window.addEventListener('load', sync);
})();
