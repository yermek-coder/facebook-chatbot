const em = bl("event");
const MetaWebhookManager = bl("meta/webhook");
const config = bl("config");

class InstagramWebhookManager extends MetaWebhookManager {
    prepareEvent(req) {
        const body = req.body.entry[0];

        if (body?.messaging?.[0]?.message) {
            return this.prepareMessageEvent(body);
        } else if (body?.changes?.[0]?.field === "comments") {
            return this.prepareCommentEvent(body);
        }
    }

    prepareMessageEvent(body) {
        const message = body?.messaging?.[0]?.message;
        const { sender, recipient, timestamp } = body?.messaging?.[0];

        const event = {
            type: "message",
            action: message?.is_deleted ? "deleted" : "created",
            text: message.text,
            id: message.mid,
            recipient: recipient.id,
            sender: sender.id,
            timestamp: new Date(timestamp).toISOString(),
            isEcho: !!message.is_echo,
            attachments: (message.attachments || []).map((att) => ({ type: att.type, url: att.payload.url })),
            quickReply: message?.quick_reply?.payload,
        };

        if (message?.reply_to) {
            event.replyTo = {
                type: message?.reply_to && (message?.reply_to?.mid ? "message" : "story"),
                id: message?.reply_to?.mid || message?.reply_to?.story?.id,
                url: message?.reply_to?.story?.url,
            };
        }

        return event;
    }

    prepareCommentEvent(body) {
        const comment = body?.changes?.[0].value;
        return {
            type: "comment",
            action: "created",
            id: comment.id,
            timestamp: new Date(body.time).toISOString(),
            parentId: comment?.parent_id,
            text: comment?.text,
            sender: {
                id: comment.from.id,
                username: comment.from.username,
            },
            media: {
                id: comment.media.id,
                type: comment.from.media_product_type,
            },
        };
    }

    async onEvent(req) {
        const verified = this.verifySignature(req, config.instagram.appSecret);
        if (verified) {
            const event = this.prepareEvent(req);
            if (event && ["message", "comment"].includes(event.type)) {
                em.emitp("instagram/" + event.type, event.action, event);
            }
        }
    }
}

module.exports = new InstagramWebhookManager();
