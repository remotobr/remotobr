const Crawler = require("crawler");
const async   = require("async");
const proxy   = process.env.PROXY || false;

function getQueueParams(URL) {
  let params = { uri: URL };
  if (proxy) {
    params['proxy'] = proxy;
  }
  return params;
}

function getNumberOfPages(URL, callback) {
  const c = new Crawler({
    maxConnections: 1,
    callback : function (error, res) {
      if(error) {
        console.log(error);
      } else {
        const $ = res.$;
        const pages = $('.job-link.selected').attr('title');
        const numberOfPages = pages.split(' of ')[1];

        callback(null, numberOfPages);
      }
    }
  });

  let queueParams = getQueueParams(URL);

  c.queue(queueParams);
}

function getPageContent(URL, callback) {
  const c = new Crawler({
    maxConnections: 1,
    callback: function (error, res, done) {
      if(error) {
        console.log(error);
      } else {
        const $ = res.$;
        let jobs = [];
        let job = {};

        $('.-job-summary').each(function() {
          Object.assign(job, {});

          job = {
            title: $(this).find('.-title h2 a').text().trim(),
            url: $(this).find('.-title h2 a').attr('href'),
            company: $(this).find('.-company .-name').text().trim(),
            timestamp: new Date(),
            perks: [],
            tags: []
          };

          $(this).find('.-perks span').each(function() {
            job.perks.push({
              key: $(this).attr('class').split('-')[1],
              value: $(this).text().trim()
            });
          });

          $(this).find('.-tags a').each(function() {
            job.tags.push($(this).text().trim());
          });

          jobs.push(job);
        });

        callback(null, jobs);
      }
    }
  });

  let queueParams = getQueueParams(URL);

  c.queue(queueParams);
}

const URL = 'https://stackoverflow.com/jobs?l=Remote&sort=p';

function run(fnAfterLoadAllJobs) {
    async.waterfall([
        (callback) => getNumberOfPages(URL, callback),
        (numberOfPages, callback) => {
          let pagesList = [];
          let parallelFunctions = [];
      
          for(var i = 1; i <= numberOfPages; i++) {
            pagesList.push(i);
          }
      
          pagesList.forEach(function(page) {
            parallelFunctions.push((done) => getPageContent(URL + '&pg=' + page, done));
          });
      
          async.parallelLimit(parallelFunctions, 10, callback);
        }
    ], fnAfterLoadAllJobs);
}

module.exports = { run };

