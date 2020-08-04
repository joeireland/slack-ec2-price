const serverless = require('aws-serverless-express');
const axios      = require('axios');
const bodyParser = require('body-parser');
const express    = require('express');

const PORT = process.env.PORT;

let app = express();
let srv = null;

async function getEC2Price(req, res) {
  let msg = {
    response_type: 'ephemeral',
    replace_original: true
  };

  try {
    let params  = req.body.text.split(' ');
    let region  = params[0];
    let os      = params[1];
    let type    = params[2];
    let url     = `https://a0.p.awsstatic.com/pricing/1.0/ec2/region/${region}/ondemand/${os}/index.json`;
    let result  = await axios.get(url);

    for (let i = 0; i < result.data.prices.length; i++) {
      let info = result.data.prices[i];

      if (info.attributes['aws:ec2:instanceType'] === type) {
        msg.text = `⚙️ region=${region}, os=${os}, type=${type}, price = ${info.price.USD}/${info.unit}`;
        console.log(msg.text);
        res.status(200).json(msg);
        return;
      }
    }

    msg.text = 'Instance type not found';
    console.error(msg.text);
    res.status(200).json(msg);
  }
  catch (e) {
      msg.text = 'Invalid region or OS';
      console.error(e);
      res.status(200).json(msg);
  }
}

function main(args) {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.post('/ec2-price', (req, res) => {
    getEC2Price(req, res);
  });

  axios.defaults.headers.post['Content-Type'] = 'application/json';

  if (PORT) {
    app.listen(PORT, () => {
      console.log(`Online: Listening on port ${PORT}`);
    });
  }
  else {
    console.log('Online: Lambda ready');
    srv = serverless.createServer(app, null);
  }
}

function lambda(event, context) {
  serverless.proxy(srv, event, context);
}

main();

exports.handler = lambda;