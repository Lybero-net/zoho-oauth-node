const fetch = require('node-fetch');
const fs = require('fs');

class token {
    constructor(Conf) {
        this.state = Conf.state;
        this.json = {};
    }

    async writeRefreshToken(value) {
        try {
           fs.writeFileSync("refresh_token.txt",value); 
        } catch (error) {
            console.log("**********************************");
            console.log("* Could not save refresh_token ! *");
            console.log("* Error : ",error);
            console.log("**********************************");
        }
    }

    // Get the refresh and access token with the code
    async getTokens(Conf,result) {
        // Direct from zoho documentation
        const params = new URLSearchParams();
        params.append('code',Conf.code);
        params.append('scope',"ZohoSubscriptions.invoices.ALL");
        params.append('client_id',Conf.clientId);
        params.append('client_secret',Conf.clientSecret);
        // state is a random number
        params.append('state',this.state);
        params.append('grant_type',"authorization_code");
        params.append('redirect_uri',Conf.baseURI+"/aruri");
        const expire = Date.now()+3600*1000;
        let res = await fetch(Conf.zohoAccountURI+"/oauth/v2/token", {
            method: "POST",
            body: params
        })
        this.json = await res.json();
        console.log("================Token========================");
        console.log("token.js - getTokens - this.json : ",this.json);
        console.log("=============================================");
        Conf.access_token = this.json.access_token;
        if ( "refresh_token" in this.json ) {
            Conf.refresh_token = this.json.refresh_token;
            /* I need to write the refresh_token */
            this.writeRefreshToken(this.json.refresh_token);
        }
        Conf.access_token_expire = expire;
        Conf.json=this.json;
        result.send("<h1>Just got access_token and refresh_token</h1><pre>"+JSON.stringify(this.json,null,2)+"</pre>");

        //return(this.json)
    }

    async getAccessToken(Conf) {
        const params = new URLSearchParams();
        params.append('refresh_token',Conf.refresh_token);
        params.append('client_id',Conf.clientId);
        params.append('client_secret',Conf.clientSecret);
        params.append('grant_type',"refresh_token");
        params.append('redirect_uri',Conf.baseURI+"/aruri");
        const expire = Date.now()+3600*1000;
        let res = await fetch(Conf.zohoAccountURI+"/oauth/v2/token", {
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

    async accessToken(Conf) {
        // Do I have an accessToken ?
        if (Conf.access_token != "") {
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
    
    /* Getting the invoices of a given user */
    async getInvoices(Conf,result_stream) {
        const access_token = await this.accessToken(Conf);
        let res = await fetch(Conf.zohoFullServiceTestURI, {
            method: "GET",
            headers: {
                "content-Type": "application/json",
                "Authorization": `Zoho-oauthtoken ${Conf.access_token}`,
                "X-com-zoho-subscriptions-organisationid": `${Conf.organisationId}`
            }
        })
        this.json = await res.json();
	    console.log("===============Invoices=====================");
	    console.log("token.js - getInvoices - this.json : ",this.json);
	    console.log("============================================");
        Conf.json = this.json;
        result_stream.send("<pre>"+JSON.stringify(this.json, null, 2)+"</pre>");
        //return(this.json)
    }
}

module.exports = token;
