import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_API_ID_INSTANCE = "7034499";
const GREEN_API_TOKEN_INSTANCE = "b1652ca01818e83442aaad";

function cleanPhone(phone: string) {
	return phone.replace(/[^\d]/g, "");
}

async function sendGreenApiMessage(phone: string, message: string) {
	const chatId = `${cleanPhone(phone)}@c.us`;
	const url = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chatId, message }),
	});

	const data = await response.text();

	return {
		ok: response.ok,
		status: response.status,
		data,
		chatId,
	};
}

function generateAutoReply(message: string) {
	const text = message.toLowerCase();

	if (text.includes("موقع") || text.includes("website")) {
		return `مرحبًا بك 👋
نقدم خدمة تصميم مواقع احترافية للشركات والمتاجر.

✅ تصميم واجهة احترافية
✅ متجاوب مع الجوال
✅ صفحات خدمات ومنتجات
✅ ربط واتساب ونماذج تواصل

السعر يبدأ من 500 ريال حسب التفاصيل.
هل تريد موقع تعريفي أم متجر إلكتروني؟`;
	}

	if (text.includes("تطبيق") || text.includes("app")) {
		return `أهلًا بك 👋
نقدم خدمة تصميم وتطوير تطبيقات الجوال.

✅ واجهات احترافية
✅ تجربة مستخدم ممتازة
✅ ربط لوحة تحكم
✅ قابل للتطوير

من فضلك ارسل فكرة التطبيق وعدد الأقسام المطلوبة.`;
	}

	if (text.includes("تصميم") || text.includes("اعلان") || text.includes("إعلان")) {
		return `مرحبًا 👋
نقدم تصاميم إعلانية احترافية للسوشيال ميديا.

✅ تصميم بوستات
✅ حملات إعلانية
✅ هوية بصرية
✅ تصاميم واتساب وإنستغرام

الأسعار تبدأ من 200 ريال حسب عدد التصاميم.`;
	}

	if (text.includes("سعر") || text.includes("كم") || text.includes("price")) {
		return `أهلًا بك 👋
هذه أسعارنا المبدئية:

🌐 تصميم موقع: يبدأ من 500 ريال
🎨 تصميم إعلاني: من 200 إلى 400 ريال
📱 تصميم تطبيق: حسب الفكرة
🎬 موشن جرافيك: حسب مدة الفيديو

ما الخدمة التي تريدها بالتحديد؟`;
	}

	return `مرحبًا بك 👋
أنا مساعد محمد الذكي.

نقدم خدمات:
🌐 تصميم مواقع
📱 تصميم تطبيقات
🎨 تصاميم إعلانية
🎬 موشن جرافيك
📢 تسويق رقمي

اكتب الخدمة التي تريدها وسأرسل لك التفاصيل.`;
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
				const result = await sendGreenApiMessage(phone, message);

				if (!result.ok) {
					return {
						content: [
							{
								type: "text",
								text: `فشل الإرسال. Status: ${result.status}. Response: ${result.data}`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: `تم إرسال الرسالة بنجاح إلى ${result.chatId}. Response: ${result.data}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"generate_sales_reply",
			{
				description: "Generate automatic sales reply for customer message",
				inputSchema: {
					message: z.string(),
				},
			},
			async ({ message }) => ({
				content: [{ type: "text", text: generateAutoReply(message) }],
			}),
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

			console.log("GREEN-API incoming message:", {
				sender,
				senderName,
				typeMessage,
				textMessage,
			});

			if (phone && textMessage) {
				const reply = generateAutoReply(textMessage);
				await sendGreenApiMessage(phone, reply);
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
