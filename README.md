puppet-photo-booth
==================

Simple screenshots using [Chrome Puppeteer](https://github.com/GoogleChrome/puppeteer).

Fetches a provided URL using Chrome's headless browser and returns a full-page PNG if the request was successful.

## Getting Started

### Installing

Using a Docker container at `http://localhost:49160`:

    docker pull danielbachhuber/puppet-photo-booth
    docker run -p 49160:8080 -d danielbachhuber/puppet-photo-booth

Using node installed on your local machine at `http://localhost:8080`:

    git clone https://github.com/danielbachhuber/puppet-photo-booth.git
    cd puppet-photo-booth
    yarn install
    yarn start

### Using

puppet-photo-booth implements a simple HTTP API.

**/v1/compare**

The compare endpoint quantifies the difference between two images. See it in action:

    https://puppet-photo-booth.herokuapp.com/v1/compare?image=https%3A%2F%2Fuser-images.githubusercontent.com%2F36432%2F32178727-b5054352-bd4a-11e7-8355-f9e57e27aba3.jpg&image=https%3A%2F%2Fuser-images.githubusercontent.com%2F36432%2F32178731-b766c9b8-bd4a-11e7-8a0c-f6e7a17fc6d6.jpg

It supports these arguments:

 * `image` (required x2): Two image URLs to compare.

It responds with a JSON blob of comparison data.

**/v1/fetch**

The fetch endpoint generates a screenshot of a provided URL. See it in action:

    https://puppet-photo-booth.herokuapp.com/v1/fetch?url=wordpress.org

It supports these arguments:

 * `url` (required): Generate a screenshot of this URL.
 * `width`: Simulated browser width for the screenshot. Default is 1024.
 * `format`: Render screenshot as 'png' or 'jpeg'. Default is 'png'.

Response time may vary, depending on how long the target page takes to load.
