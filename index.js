const express = require('express')
const app = express()
const port = 3020

import zohoconf from "./zohoconf.js";
import token from "./token.js";

let Conf = new zohoconf();
let currentToken = new token(Conf);

app.use(express.urlencoded());



const wrapAsync = (fn) => {
    return (req, res, next) => {
        const fnReturn = fn(req, res, next);
        return Promise.resolve(fnReturn).catch(next);
    }
};

/* Just for test */
app.get('/', (req, res) => {
  let clientSecret = Conf.clientSecret;
  let clientId = Conf.clientId;
  res.send(`Hello World!<br>`)
})

/* Show all invoices */
app.get('/invoices', (req, res) => {
    let content = 'Get invoices';
    try {
        wrapAsync(currentToken.getInvoices(Conf,res));
    } catch(e) {
        if ( "error" in e ) {
            content = e.error;
        } else {
            content ="An error occured";
        }   
        console.log("#################### index.js invoices e ###############");
        console.log("error : ",e);
        console.log("########################################################");
    }
    //res.send("<pre>"+content+"</pre>");
})

app.get('/aruri', (req, res) => {
    console.log("I should first get access_token / expires_in");
    console.log("################index.js##################");
    console.log(req.query);
    let content = "";
    // Case code :
    if ( "code" in req.query ) {
      Conf.code=req.query["code"];
      console.log("Found code ! ",Conf.code);
      content += "Found code !<br>";
      try {
          // Now getting the refresh and access tokens
          wrapAsync(currentToken.getTokens(Conf,res));
      } catch(e) {
          if ( "error" in e ) {
              content = e.error;
          } else {
              content ="An error occured";
          }   
          console.log("#################### index.js tokens e ###############");
          console.log("error : ",e);
          console.log("######################################################");
      }
    }
    console.log("##########################################"); 
    //res.send(content)
})


app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`)
})
