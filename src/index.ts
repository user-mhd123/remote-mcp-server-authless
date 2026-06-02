import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

interface Env {
	OPENROUTER_API_KEY: string;
	GREEN_API_TOKEN_INSTANCE: string;
}

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_API_ID_INSTANCE = "7107634499";
const OPENROUTER_MODEL = "openrouter/free";

function cleanPhone(phone: string) {
	return phone.replace(/[^\d]/g, "");
}

async function sendWhatsApp(env: Env, phone: string, message: string) {
	const chatId = `${cleanPhone(phone)}@c.us`;
	const url = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${env.GREEN_API_TOKEN_INSTANCE}`;

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chatId, message }),
	});

	return { ok: res.ok, status: res.status, data: await res.text(), chatId };
}

async function generateAIReply(env: Env, message: string, name = "") {
	const prompt = `
أنت مساعد محمد الذكي عبر واتساب.
ترد مثل ChatGPT لكن بأسلوب مبيعات محترف ومختصر.

خدمات محمد:
- تصميم مواقع ومتاجر إلكترونية
- تصميم تطبيقات
- تصاميم إعلانية
- موشن جرافيك
- تسويق رقمي
- أتمتة واتساب وAI

الأسعار:
- الموقع يبدأ من 500 ريال
- التصاميم من 200 إلى 400 ريال
- التطبيق والموشن حسب التفاصيل

الرد يجب أن يكون عربي، واضح، مقنع، وفي آخره سؤال واحد فقط.
`;

	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
			"HTTP-Referer": "https://remote-mcp-server-authless.moshmmedmoshmmed88.workers.dev",
			"X-Title": "Mohammed WhatsApp AI Agent",
		},
		body: JSON.stringify({
			model: OPENROUTER_MODEL,
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: `اسم العميل: ${name || "غير معروف"}\nرسالة العميل: ${message}` },
			],
		}),
	});

	const data: any = await res.json();

	if (!res.ok) {
		return `خطأ OpenRouter: status=${res.status} details=${JSON.stringify(data).slice(0, 400)}`;
	}

	return data?.choices?.[0]?.message?.content || "مرحبًا، كيف أقدر أساعدك؟";
}

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Mohammed WhatsApp AI Agent",
		version: "1.0.0",
	});

	async init() {
		this.server.registerTool(
			"test_connection",
			{ description: "Test server", inputSchema: {} },
			async () => ({ content: [{ type: "text", text: "MCP يعمل ✅" }] }),
		);

		this.server.registerTool(
			"ai_sales_reply",
			{
				description: "Generate AI sales reply",
				inputSchema: {
					message: z.string(),
					customerName: z.string().optional(),
				},
			},
			async ({ message, customerName }) => {
				const env = this.env as Env;
				const reply = await generateAIReply(env, message, customerName || "");
				return { content: [{ type: "text", text: reply }] };
			},
		);

		this.server.registerTool(
			"send_whatsapp_message",
			{
				description: "Send WhatsApp message",
				inputSchema: {
					phone: z.string(),
					message: z.string(),
				},
			},
			async ({ phone, message }) => {
				const env = this.env as Env;
				const result = await sendWhatsApp(env, phone, message);
				return {
					content: [{
						type: "text",
						text: result.ok ? `تم الإرسال إلى ${result.chatId}` : `فشل: ${result.status} ${result.data}`,
					}],
				};
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
				const reply = await generateAIReply(env, textMessage, senderName);
				await sendWhatsApp(env, phone, reply);
			}

			return Response.json({ ok: true, received: true });
		}

		return new Response("Mohammed WhatsApp AI Agent is running ✅", { status: 200 });
	},
};
