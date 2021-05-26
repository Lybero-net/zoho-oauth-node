# Using Oauth2 for accessing Zoho API from a node application

## 1. Introduction

I need to use zoho subscriptions API. In june, the traditional way to authenticate on this API is changing. Oauth2 will be mandatory.

Zoho is providing a lot of documentation. For me however, in my specific case, I had to do some experiments to use the Oauth2 authentication in my node application. This document is my code and my documentation on these experiments.

Some details on my case. CryptnDrive is a react/nodejs/mongodb application providing end-to-end encrypted file sharing. It has a web interface and we want people to be able to buy datarooms directly in the web user interface. Users must also be able to get directly their invoices, to cancel, to order directly. We developped directly these possibilities thanks to the possibilities of Zoho subscription API. And now it must work in using the Oauth2 authentication system.

## 2. Documentation

The main source of documentation is : https://www.zoho.com/subscriptions/api/v1/?src=subscriptions-webapp#oauth
You soon will also have to open : https://api-console.zoho.com/

## 3. Quick and dirty guide

  * get an API key, Luke. Go to https://api-console.zoho.com/, you have a list of applications (maybe none on start). Add a client. Choose Server Based Applications. In my case, the informations to be provided are :
    * Client name : a test luke
    * Home page url : https://zohotest.lybero.net
    * Authorized redirect urls (more on that later) : https://zohotest.lybero.net/aruri
    And update the page. On the second tab, you will be able to get the client Id and client Secret that you need for going ahead.
  * get a one minute temporary "code" (called the grant token in the documentation of Zoho) to kickstart the process with your web browser. Don't do that with fetch, curl, whatever. It must be manual. You have to create a long, borring url, as described in zoho documentation : 
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoSubscriptions.customers.ALL,ZohoSubscriptions.subscriptions.ALL,ZohoSubscriptions.invoices.ALL,ZohoSubscriptions.products.READ,ZohoSubscriptions.plans.READ,ZohoSubscriptions.payments.CREATE,ZohoSubscriptions.payments.READ &client_id=1000.ZYSYSYSXXX34527SSST&state=ARANDOMECODE4U&response_type=code&redirect_uri=https://zohotest.lybero.net/aruri&access_type=offline

Believe me, first create your url in a text editor, and cut and paste it in your web browser. You will thank me. And beware, because for me, it is a one shot. I have never succeeded to use it twice. If once you generated your refresh code, you want to regenerate one, for me it does not work (at least in the same hour, maybe after a delay ?). I needed in that last case to recreate a new API key (same information, other name).

You will not get the "code" through the web page. Instead, Zoho will use your Redirect url, and will append to it the code information. Basically zoho gets the page : https://zohotest.lybero.net/aruri?variousfirst=info1&another=info2&code=mypreciouscode .

  * So, when the code is received, the refresh and access tokens are automatically called (look in index.js /aruri route). This is a post on https://accounts.zoho.com/oauth/v2/token with scope, code, client_secret, state, grant_type=authorization_code, redirect_uri (yes, one that you defined above, and nothing else). The answer to the post is a json, where refresh_token and access_token are defined. Store the refresh token ! This is the key to the kingdom, because with it, you can ask for new access_token (that are only valid one hour). Personnaly, I also store the expiration date of the access_token (which is now + 1 hour = 3600*1000). The code for all that is in token.js, function getTokens.

  * Well time to play with your zoho api. For example, to get all invoices of a customer :

```javascript 
        const access_token = await this.accessToken(Conf);
        let res = await fetch("https://subscriptions.zoho.com/api/v1/invoices?customer_id=1279999000000293015&organization_id=668537797", {
            method: "GET",
            headers: {
                "content-Type": "application/json",
                "Authorization": `Zoho-oauthtoken ${Conf.access_token}`,
                "X-com-zoho-subscriptions-organisationid": `${Conf.organisationId}`
            }
        })
        this.json = await res.json();
```

  * There is a trick in the code above : const access_token = await this.accessToken(Conf). this.accessToken checks if the access_token is still valid. If it isn't, it asks for a new one :

```javascript
    async accessToken(Conf) {
        // Do I have an accessToken ?
        if (Conf.access_token != "") {
            // Yes, I have one, checking for validity.
            const now = Date.now();
            if ( "access_token_expire" in Conf) {
                if (now < Conf.access_token_expire) {
                    // All is good, I have an access token and it is still valid
                    return(Conf.access_token);
                }
            }
        }
        
        // I need to get an access_token
        Conf.access_token = await this.getAccessToken(Conf);
        return(Conf.access_token);
    }
```
    And : 
```javascript
    async getAccessToken(Conf) {
        const params = new URLSearchParams();
        params.append('refresh_token',Conf.refresh_token);
        params.append('client_id',Conf.clientId);
        params.append('client_secret',Conf.clientSecret);
        params.append('grant_type',"refresh_token");
        params.append('redirect_uri',"https://zohotest.lybero.net/aruri");
        const expire = Date.now()+3600*1000;
        let res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
            method: "POST",
            body: params
        })
        Conf.access_token_expire = expire;
        this.json = await res.json();
        Conf.json = this.json;
        console.log("===============AccessToken========================");
        console.log("token.js - getAccessToken - this.json : ",this.json);
        console.log("==================================================");
        return(this.json.access_token)
    }
```
## 4. Using the code

This code is a test code for understanding how Oauth2 works in zoho. However, it works. If you want to use it :
* git clone
* generate the api key as described above,
* edit zohoconf.js and put the good information,
* npm i to get all babel dependencies,
* export PATH=$PATH:/the/good/path/node_modules/.bin
* you need an apache front-end, in my case the configuration is the following (/etc/apache2/sites-available/zohotest.lybero.net) :

```
        <VirtualHost zohotest.lybero.net:80>
                ServerName zohotest.lybero.net
                ServerAdmin your@mail.net
                DocumentRoot /var/www/html

                ErrorLog ${APACHE_LOG_DIR}/error.log
                CustomLog ${APACHE_LOG_DIR}/access.log combined

                RewriteEngine on
                RewriteRule !^/.well-known https://%{SERVER_NAME}%{REQUEST_URI} [END,QSA,R=permanent]
        </VirtualHost>

        <IfModule mod_ssl.c>
        <VirtualHost zohotest.lybero.net:443>
                ServerName zohotest.lybero.net
                ServerAdmin your@mail.net
                DocumentRoot /var/www/html

                ErrorLog ${APACHE_LOG_DIR}/error.log
                CustomLog ${APACHE_LOG_DIR}/access.log combined

                SSLCertificateFile /etc/letsencrypt/live/zohotest.lybero.net/fullchain.pem
                SSLCertificateKeyFile /etc/letsencrypt/live/zohotest.lybero.net/privkey.pem
                Include /etc/letsencrypt/options-ssl-apache.conf

                # -----------------------------------------------------------------------------------
                # --- redirection for lynvictus demo -------------------------------------------
                # -----------------------------------------------------------------------------------
                ProxyPreserveHost On
                ProxyRequests off

                RewriteEngine On
                RewriteCond %{HTTP:Upgrade} =websocket [NC]
                RewriteRule /(.*)           ws://localhost:3020//home/aherbeth/source/lynvictus-4.0.5/scripts/template/apache_conf/instance.conf [P,L]

                ProxyPass / http://localhost:3020/ retry=1 acquire=3000 timeout=600 Keepalive=On
                ProxyPassReverse / http://localhost:3020/
                ProxyPassReverseCookiePath http://localhost:3020 https://zohotest.lybero.net
                # ----------------------------------------------------------------------------------
        </VirtualHost>
        </IfModule>
```

* You start your service with babel-node index.js
* Check that https://zohotest.yoururl.com works with a browser.
* Ask for the "code" 
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoSubscriptions.customers.ALL,ZohoSubscriptions.subscriptions.ALL,ZohoSubscriptions.invoices.ALL,ZohoSubscriptions.products.READ,ZohoSubscriptions.plans.READ,ZohoSubscriptions.payments.CREATE,ZohoSubscriptions.payments.READ &client_id=1000.ZYSYSYSXXX34527SSST&state=ARANDOMECODE4U&response_type=code&redirect_uri=https://zohotest.lybero.net/aruri&access_type=offline
* If everything goes right, you can now play. You have the following url available :
  * https://zohotest.yoururl.com/  => a test url
  * https://zohotest.yoururl.com/invoices => show invoices for a customer

## 5. Code organisation

* zohoconf.js : all configuration parameters
* index.js : the express answers with the routing to the different functions
* token.js : the functions to get tokens or process them
* refresh_token.txt : file where the refresh_token is written between 2 runs.
