const express = require("express");
const path = require("path");
const { Resend } = require("resend");
const puppeteer = require("puppeteer");

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.static(path.join(__dirname, "public")));

app.post("/webhook", express.raw({ type: "application/json" }), async function(req, res) {
    try {
        const crypto = require("crypto");

        const signature = req.headers["x-crynova-sig"];
        const secret = process.env.CRYNOVA_WEBHOOK_SECRET;

        if (!signature || !secret) {
            console.error("Немає підпису або секрету Crynova");
            return res.status(401).send("Unauthorized");
        }

        const expectedSignature =
            "sha256=" +
            crypto
                .createHmac("sha256", secret)
                .update(req.body)
                .digest("hex");

        if (
            !crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            )
        ) {
            console.error("Невірний підпис Crynova");
            return res.status(403).send("Invalid signature");
        }

        const data = JSON.parse(req.body.toString());

        console.log("WEBHOOK Crynova:", data);

        if (data.event === "invoice.paid" && data.status === "paid") {
            console.log("ОПЛАТА ПІДТВЕРДЖЕНА!");
            console.log("Order ID:", data.order_id);
            console.log("Сума:", data.price_amount, data.price_currency);
            console.log("Отримано:", data.amount, data.pay_currency);
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Помилка webhook:", error);
        return res.status(500).send("Webhook error");
    }
});

app.post(
    "/webhook/cryptopayr",
    express.raw({ type: "application/json" }),
    async function(req, res) {
        try {
            const crypto = require("crypto");

            const signature = req.headers["x-cryptopayr-signature"];
            const apiKey = process.env.CRYPTOPAYR_API_KEY;

            if (!signature || !apiKey) {
                console.error("CryptoPayr: немає підпису або API key");
                return res.status(401).send("Unauthorized");
            }

            const expectedSignature = crypto
                .createHmac("sha256", apiKey)
                .update(req.body)
                .digest("hex");

            const received = Buffer.from(signature, "utf8");
            const expected = Buffer.from(expectedSignature, "utf8");

            if (
                received.length !== expected.length ||
                !crypto.timingSafeEqual(received, expected)
            ) {
                console.error("CryptoPayr: невірний підпис");
                return res.status(403).send("Invalid signature");
            }

            const data = JSON.parse(req.body.toString());

            console.log("WEBHOOK CryptoPayr:", data);

            if (data.status === "COMPLETED") {
                console.log("ОПЛАТА CryptoPayr ПІДТВЕРДЖЕНА!");
                console.log("Transaction ID:", data.tid);
                console.log("Metadata:", data.metadata);
                const order = pendingOrders.get(data.metadata);

console.log("ЗНАЙДЕНО РЕЗЮМЕ:", !!order);
                if (!order) {
    console.error("Не знайдено замовлення для:", data.metadata);
    return res.status(400).send("Order not found");
}
                const pdfResponse = await fetch(
    "https://cvly.onrender.com/generate-pdf",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            html: order.html,
            css: order.css,
            email: order.email
        })
    }
);

const pdfResult = await pdfResponse.json();

console.log("РЕЗУЛЬТАТ СТВОРЕННЯ PDF:", pdfResult);
                console.log("Сума:", data.amount, data.currency);
            }

            return res.status(200).send("OK");

        } catch (error) {
            console.error("Помилка CryptoPayr webhook:", error);
            return res.status(500).send("Webhook error");
        }
    }
);

app.use(express.json({ limit: "15mb" }));

app.post("/generate-pdf", async function(req, res) {
console.log("ЗАПИТ /generate-pdf ОТРИМАНО");

    let browser;

    try {
        const { html, css, email } = req.body;

        if (!html) {
            return res.status(400).json({
                success: false,
                message: "Немає HTML резюме"
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Не вказана електронна пошта"
            });
        }

        browser = await puppeteer.launch({
            headless: true
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 794,
            height: 1123,
            deviceScaleFactor: 1
        });

        await page.emulateMediaType("print");

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="uk">
            <head>
                <meta charset="UTF-8">

                <style>
                    ${css || ""}

                    @page {
                        size: A4;
                        margin: 0;
                    }

                    html,
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .resume-preview {
    background: white !important;
}
                </style>
            </head>

            <body>
                ${html}
            </body>
            </html>
        `;

        await page.setContent(fullHtml, {
            waitUntil: "load",
            timeout: 10000
        });

console.log("ПОЧИНАЮ СТВОРЕННЯ PDF");
console.log("HTML PDF:", html.substring(0, 500));
console.log("CSS PDF:", css ? css.length : 0);
console.log("РОЗМІР СТОРІНКИ:", await page.evaluate(() => {
    const el = document.querySelector(".resume-preview");
    return {
        width: el ? el.offsetWidth : null,
        height: el ? el.offsetHeight : null
    };
}));
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0"
            }
        });
console.log("PDF СТВОРЕНИЙ, РОЗМІР:", pdf.length);
console.log("ПАПКА:", __dirname);
const fs = require("fs");
fs.writeFileSync(path.join(__dirname, "test-CVly.pdf"), pdf);
console.log("ТЕСТОВИЙ PDF ЗБЕРЕЖЕНО");


        const base64Pdf = Buffer.from(pdf).toString("base64");
        console.log("BASE64 TYPE:", typeof base64Pdf);
        console.log("BASE64 LENGTH:", base64Pdf.length);
        console.log("BASE64 START:", base64Pdf.substring(0, 30));
        
        const { data, error } = await resend.emails.send({
            from: "CVly <hello@cvly.pp.ua>",
            to: [email],
            subject: "Твоє резюме від CVly",

            html: `
                <h2>Твоє резюме готове! 🎉</h2>

                <p>Дякуємо, що скористалася CVly.</p>

                <p>
                    Твоє професійне резюме прикріплене
                    до цього листа у форматі PDF.
                </p>

                <p>
                    Бажаємо успіхів у пошуку роботи ❤️
                </p>
            `,

            attachments: [
    {
        filename: "CVly-resume.pdf",
        content: base64Pdf,
        content_type: "application/pdf"
    }
]
        });

        if (error) {
            console.error("[Resend API Error]:", error);

            return res.status(500).json({
                success: false,
                message: "Не вдалося відправити резюме на пошту"
            });
        }

        console.log("Лист успішно відправлено:", data);

        return res.status(200).json({
            success: true,
            message: "Резюме успішно відправлено на пошту"
        });

    } catch (error) {
        console.error("Помилка створення PDF:", error);

        return res.status(500).json({
            success: false,
            message: "Не вдалося створити або відправити PDF"
        });

    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

const pendingOrders = new Map();

app.post("/create-cryptopayr-payment", async function(req, res) {
    try {
        const crypto = require("crypto");
        const { amount, currency, metadata, resume, html, css } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({
                success: false,
                message: "Не вказана сума або валюта"
            });
        }

        const response = await fetch(
            "https://cryptopayr.com/api/v1/payment/create",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.CRYPTOPAYR_API_KEY}`,
                    "Content-Type": "application/json",
                    "Idempotency-Key": crypto.randomUUID()
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    metadata,
                    success_url: "https://cvly.onrender.com/",
    cancel_url: "https://cvly.onrender.com/"
                })
            }
        );

        const data = await response.json();

        console.log("CryptoPayr payment:", data);
        if (data.data && data.data.tid) {
    pendingOrders.set(metadata, {
    tid: data.data.tid,
    resume: resume,
    html: html,
    css: css,
    email: resume.email,
    amount: amount,
    currency: currency
});
}

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: "CryptoPayr не створив платіж",
                error: data
            });
        }

        return res.status(200).json({
            success: true,
            checkout_url: data.data.checkout_url
        });

    } catch (error) {
        console.error("CryptoPayr payment error:", error);

        return res.status(500).json({
            success: false,
            message: "Помилка створення платежу"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function() {
    console.log("CVly запущено на порту " + PORT);
});
