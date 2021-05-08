const request = require('supertest');
const path = require('path');
const app = require(path.join(__dirname, '../app/server'));
const config = require('config');
const chai = require('chai');
chai.use(require("chai-dom"));
const should = chai.should();
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('GET /health should return 200 OK', function() {
  it('responds 200 OK', function(done) {
    request(app)
      .get('/health')
      .expect(200, done)
      .expect((res) => {
        res.text.should.equal("Healthy");
      });
  });
});

describe('GET / should return a html page', function() {
  it('responds 200 OK', function(done) {
    config.columns = 2;
    config.websites = [
      {"url": "https://time.is/"},
      {"url": "https://www.epochconverter.com/"}
    ];
    request(app)
      .get('/')
      .expect('Content-Type', /text\/html/)
      .expect((res) => {
        const dom = new JSDOM(res.text);
        const grid = dom.window.document.querySelector('#grid');
        grid.should.have.descendants('.row').and.have.length(1);
        const cols = grid.querySelector('.row').should.have.descendants('.col').and.have.length(2);
      })
      .expect(200, done);
  });
});

describe('GET /screenshots should return encoded images for each url', function() {
  it('responds 200 OK', function(done) {
    config.websites = [{
        url: 'https://www.google.com',
        headers: {
          'Accept-Language': 'en-US,en;q=0.5'
        },
        cookies: [
          'id=unicorn; Expires=Wed, 1 Dec 2021 23:59:00 GMT;'
        ],
        authentication: {
          username: "foo",
          password: "bar"
        }
    }];
    this.timeout(10000);
    request(app)
      .get('/screenshots')
      .expect((res) => {
        should.not.equal(res.body['https://www.google.com'], null);
      })
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
