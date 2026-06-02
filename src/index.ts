import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_API_ID_INSTANCE = "7107634499";
const GREEN_API_TOKEN_INSTANCE = "PASTE_GREEN_API_TOKEN_HERE";

const OPENROUTER_API_KEY = "PASTE_OPENROUTER_KEY_HERE";
const OPENROUTER_MODEL = "openrouter/free";

function cleanPhone(phone: string) {
	return phone.replace(/[^\d]/g, "");
}

async function sendWhatsApp(phone: string, message: string) {
	const chatId = `${cleanPhone(phone)}@c.us`;
	const url = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chatId, message }),
	});

	return {
		ok: res.ok,
		status: res.status,
		data: await res.text(),
		chatId,
	};
}

async function generateAIReply(customerMessage: string, customerName = "") {
	const systemPrompt = `
أنت مساعد محمد الذكي للمبيعات عبر واتساب.
ترد مثل ChatGPT: تفهم رسالة العميل، تحلل طلبه، وترد برد طبيعي ومقنع.

معلومات محمد:
- يقدم تصميم مواقع احترافية للشركات والمتاجر.
- تصميم متاجر إلكترونية.
- تصميم تطبيقات.
- تصاميم إعلانية للسوشيال ميديا.
- موشن جرافيك.
- تسويق رقمي.
- أتمتة واتساب وربط أدوات AI وMCP.

الأسعار المبدئية:
- تصميم موقع يبدأ من 500 ريال.
- التصاميم الإعلانية من 200 إلى 400 ريال.
- التطبيق حسب الفكرة.
- الموشن جرافيك حسب المدة.
- الأتمتة حسب المطلوب.

طريقة الرد:
- رد بالعربية.
- كن محترفًا وودودًا.
- لا تطوّل.
- لا تخترع سعر نهائي.
- اسأل سؤالًا واحدًا في آخر الرد.
- إذا العميل غير واضح، اسأله عن الخدمة المطلوبة.
`;

	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${OPENROUTER_API_KEY}`,
			"HTTP-Referer": "https://remote-mcp-server-authless.moshmmedmoshmmed88.workers.dev",
			"X-Title": "Mohammed WhatsApp AI Agent",
		},
		body: JSON.stringify({
			model: OPENROUTER_MODEL,
			messages: [
				{ role: "system", content: systemPrompt },
				{
					role: "user",
					content: `اسم العميل: ${customerName || "غير معروف"}\nرسالة العميل: ${customerMessage}`,
				},
			],
		}),
	});

	const data: any = await res.json();

	if (!res.ok) {
		return `عذرًا، حدث خطأ مؤقت في المساعد الذكي. يمكنك توضيح الخدمة المطلوبة وسأرد عليك قريبًا.`;
	}

	return data?.choices?.[0]?.message?.content || "مرحبًا بك، كيف أقدر أساعدك؟";
}

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Mohammed WhatsApp AI Agent",
		version: "1.0.0",
	});

	async init() {
		this.server.registerTool(
			"test_connection",
			{
				description: "Test server connection",
				inputSchema: {},
			},
			async () => ({
				content: [{ type: "text", text: "Mohammed MCP Server is working ✅" }],
			}),
		);

		this.server.registerTool(
			"send_whatsapp_message",
			{
				description: "Send WhatsApp message using GREEN-API",
				inputSchema: {
					phone: z.string(),
					message: z.string(),
				},
			},
			async ({ phone, message }) => {
				const result = await sendWhatsApp(phone, message);

				return {
					content: [
						{
							type: "text",
							text: result.ok
								? `تم الإرسال بنجاح إلى ${result.chatId}`
								: `فشل الإرسال. Status: ${result.status}. ${result.data}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"ai_sales_reply",
			{
				description: "Generate smart AI sales reply using OpenRouter",
				inputSchema: {
					message: z.string(),
					customerName: z.string().optional(),
				},
			},
			async ({ message, customerName }) => {
				const reply = await generateAIReply(message, customerName || "");
				return { content: [{ type: "text", text: reply }] };
			},
		);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		if (url.pathname === "/webhook/greenapi") {
			if (request.method !== "POST") {
				return new Response("Method not allowed", { status: 405 });
			}

			const body = await request.json<any>();

			const sender = body?.senderData?.sender || "";
			const senderName = body?.senderData?.senderName || "";
			const messageData = body?.messageData || {};
			const typeMessage = messageData?.typeMessage || "";

			let textMessage = "";

			if (typeMessage === "textMessage") {
				textMessage = messageData?.textMessageData?.textMessage || "";
			}

			if (typeMessage === "extendedTextMessage") {
				textMessage = messageData?.extendedTextMessageData?.text || "";
			}

			const phone = sender.replace("@c.us", "");

			if (phone && textMessage) {
				const aiReply = await generateAIReply(textMessage, senderName);
				await sendWhatsApp(phone, aiReply);
			}

			return Response.json({
				ok: true,
				received: true,
				sender,
				senderName,
				typeMessage,
				textMessage,
			});
		}

		return new Response("Mohammed WhatsApp AI Agent is running. Use /mcp endpoint.", {
			status: 200,
		});
	},
};
