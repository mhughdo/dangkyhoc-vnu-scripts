const request = require('request')

function postRequest(URL, data, jar) {
  return new Promise(function(resolve, reject) {
    request(
      {
        url: URL,
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: data,
        jar,
        timeout: 30000,
      },
      async (error, response, body) => {
        if (!error) {
          resolve({response, body})
        } else {
          reject(error)
        }
      }
    )
  })
}

module.exports = postRequest
