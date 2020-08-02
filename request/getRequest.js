const request = require('request')

function getRequest(URL, jar) {
  return new Promise(function(resolve, reject) {
    request(
      {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
          'Content-Type': 'application/json',
        },
        url: URL,
        method: 'GET',
        jar,
        timeout: 30000,
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve(body)
        } else {
          reject(error)
        }
      }
    )
  })
}

module.exports = getRequest
