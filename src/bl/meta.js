const crypto = require("crypto");

class Meta {
    onMetaCheck(req, res) {
        const challenge = req.query["hub.challenge"];
        const verify_token = req.query["hub.verify_token"];

        if (verify_token === bl("config").meta.token) {
            return res.status(200).send(challenge);
        }
        return res.status(400).send({ message: "Bad request!" });
    }

    verifySignature(req, secret) {
        const payload = req.rawBody;
        const signature = req.headers["x-hub-signature-256"];

        // Generate the expected signature
        const expectedSignature = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");

        // Compare with the received signature
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
}

module.exports = new Meta();
