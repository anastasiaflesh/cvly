const express = require("express");
const path = require("path");
const { Resend } = require("resend");
const puppeteer = require("puppeteer");

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: "15mb" }));

app.use(express.static(path.join(__dirname, "public")));

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function() {
    console.log("CVly запущено на порту " + PORT);
});