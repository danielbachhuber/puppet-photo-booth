puppet-photo-booth
==================

Simple screenshots using [Chrome Puppeteer](https://github.com/GoogleChrome/puppeteer).

Fetches a provided URL using Chrome's headless browser and returns a full-page PNG if the request was successful.

Try it out: https://puppet-photo-booth.herokuapp.com/wordpress.org

## Getting Started

### Installing

Using Docker:

    $ docker pull danielbachhuber/puppet-photo-booth
    # Run the container on port 49160
    $ docker run -p 49160:8080 -d danielbachhuber/puppet-photo-booth

Using node on your local machine:

    $ git clone https://github.com/danielbachhuber/puppet-photo-booth.git
    $ cd puppet-photo-booth
    $ yarn install
    $ yarn start

### Using

Simply append the URL you'd like to screenshot.

If PPB is running on `localhost:8080`, the full URL would be `http://localhost:8080/wordpress.org`.

It may take a few seconds to load — because it's making a request to the URL you've specified.
