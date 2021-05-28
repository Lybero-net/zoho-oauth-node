const fetch = require('node-fetch');
const fs = require('fs');

class token {
    constructor(Conf) {
        this.state = Conf.state;
        this.json = {};
    }

    async ASfetch(url, params) {
        let res = await fetch(url, {
            method: "POST",
            body: params
        })
        return (await res.json());
    }

    async ASfetchWithToken(Conf, url) {
        console.log("token.js - Entering ASfetchWithToken");
        const access_token = await this.ASaccessToken(Conf);
        let res = await fetch(Conf.zohoFullServiceTestURI, {
            method: "GET",
            headers: {
                "content-Type": "application/json",
                "Authorization": `Zoho-oauthtoken ${Conf.access_token}`,
                "X-com-zoho-subscriptions-organisationid": `${Conf.organisationId}`
            }
        })
        return (await res.json());
    }

    async ASwriteRefreshToken(value) {
        console.log("token.js - Entering ASwriteRefreshToken");
        try {
            fs.writeFileSync("refresh_token.txt", value);
        } catch (error) {
            console.log("**********************************");
            console.log("* Could not save refresh_token ! *");
            console.log("* Error : ", error);
            console.log("**********************************");
        }
    }

    // Get the refresh and access token with the code
    async ASgetTokens(Conf, result) {
        console.log("token.js - Entering ASgetTokens");
        // Direct from zoho documentation
        const params = new URLSearchParams();
        params.append('code', Conf.code);
        params.append('scope', "ZohoSubscriptions.invoices.ALL");
        params.append('client_id', Conf.clientId);
        params.append('client_secret', Conf.clientSecret);
        // state is a random number
        params.append('state', this.state);
        params.append('grant_type', "authorization_code");
        params.append('redirect_uri', Conf.baseURI + "/aruri");
        const expire = Date.now() + 3600 * 1000;
        this.json = await this.ASfetch(Conf.zohoAccountURI + "/oauth/v2/token", params);
        /*let res = await fetch(Conf.zohoAccountURI+"/oauth/v2/token", {
            method: "POST",
            body: params
        })
        this.json = await res.json();*/
        console.log("================Token========================");
        console.log("token.js - ASgetTokens - this.json : ", this.json);
        console.log("=============================================");
        Conf.access_token = this.json.access_token;
        if ("refresh_token" in this.json) {
            Conf.refresh_token = this.json.refresh_token;
            /* I need to write the refresh_token */
            await this.ASwriteRefreshToken(this.json.refresh_token);
        }
        Conf.access_token_expire = expire;
        Conf.json = this.json;
        result.send("<h1>Just got access_token and refresh_token</h1><pre>" + JSON.stringify(this.json, null, 2) + "</pre>");

        //return(this.json)
    }

    async ASgetAccessToken(Conf) {
        console.log("token.js - Entering ASgetAccessToken");
        const params = new URLSearchParams();
        params.append('refresh_token', Conf.refresh_token);
        params.append('client_id', Conf.clientId);
        params.append('client_secret', Conf.clientSecret);
        params.append('grant_type', "refresh_token");
        params.append('redirect_uri', Conf.baseURI + "/aruri");
        const expire = Date.now() + 3600 * 1000;
        this.json = await this.ASfetch(Conf.zohoAccountURI + "/oauth/v2/token", params)
            /*let res = await fetch(Conf.zohoAccountURI+"/oauth/v2/token", {
                method: "POST",
                body: params
            })
            this.json = await res.json(); */
        Conf.access_token_expire = expire;
        Conf.json = this.json;
        console.log("===============AsgetAccessToken========================");
        console.log("token.js - ASgetAccessToken - this.json : ", this.json);
        console.log("==================================================");
        return (this.json.access_token)
    }

    async ASaccessToken(Conf) {
        console.log("token.js - Entering ASaccessToken");
        // Do I have an accessToken ?
        if (Conf.access_token != "") {
            const now = Date.now();
            if ("access_token_expire" in Conf) {
                if (now < Conf.access_token_expire) {
                    // All is good, I have an access token and it is still valid
                    return (Conf.access_token);
                }
            }
        }

        // I need to get an access_token
        Conf.access_token = await this.ASgetAccessToken(Conf);
        return (Conf.access_token);
    }

    /* Getting the invoices of a given user */
    async ASgetInvoices(Conf, result_stream) {
        console.log("token.js - Entering ASgetInvoices");
        this.json = await this.ASfetchWithToken(Conf,Conf.zohoFullServiceTestURI);
        /*const access_token = await this.accessToken(Conf);
        let res = await fetch(Conf.zohoFullServiceTestURI, {
            method: "GET",
            headers: {
                "content-Type": "application/json",
                "Authorization": `Zoho-oauthtoken ${Conf.access_token}`,
                "X-com-zoho-subscriptions-organisationid": `${Conf.organisationId}`
            }
        })
        this.json = await res.json(); */
        console.log("===============ASgetInvoices=====================");
        console.log("token.js - ASgetInvoices - this.json : ", this.json);
        console.log("=================================================");
        Conf.json = this.json;
        result_stream.send("<pre>" + JSON.stringify(this.json, null, 2) + "</pre>");
        //return(this.json)
    }
}

module.exports = token;
