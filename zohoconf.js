const fs = require('fs');
 
class zohoconf {
    constructor() {
        // No / at the end please.
        this.zohoAccountURI = "https://accounts.zoho.com";
        this.baseURI = "https://zohotest.lybero.net";

        // Get that from https://api-console.zoho.com/
        this.clientId="1000.SOMETHINGYOUGOTFROMZOHOAPI";
        this.clientSecret = "b8affff3336666777bbbbbbbbb2222211111222222";

        // A random string
        this.state = "89FA198SS0LFLFLZU603;!!!!1238777";
        this.code = "";
        this.access_token = "";
        this.refresh_token = "";

        // The zoho service you want to use
        this.zohoServiceURI = "https://subscriptions.zoho.com";
        this.organisationId = "113342232";
        this.customerId = "9990000111102918373";
        this.zohoFullServiceTestURI = this.zohoServiceURI+"/api/v1/invoices?customer_id="+this.customerId+"&organization_id="+this.organisationId;

        // I read refresh_token from the disk !!!
        try {
            this.refresh_token = fs.readFileSync("refresh_token.txt");
        } catch (error) {
            this.refresh_token = ""
            // I should get it
            console.log("Please first get a refresh_token !");
            console.log("Error :",error);
        }

        this.json = {};
    }
}

module.exports = zohoconf;
