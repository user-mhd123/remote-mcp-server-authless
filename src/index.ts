import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_API_ID_INSTANCE = "7107634499";
const GREEN_API_TOKEN_INSTANCE = "b1652ca0593b4b10b3dbd89c7b5922c51818ebe7d83442aaad";

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Mohammed WhatsApp MCP Server",
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
				const cleanPhone = phone.replace(/[^\d]/g, "");
				const chatId = `${cleanPhone}@c.us`;

				const url = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;

				const response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chatId,
						message,
					}),
				});

				const data = await response.text();

				if (!response.ok) {
					return {
						content: [
							{
								type: "text",
								text: `فشل الإرسال. Status: ${response.status}. Response: ${data}`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: `تم إرسال الرسالة بنجاح إلى ${chatId}. Response: ${data}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"add",
			{
				description: "Add two numbers",
				inputSchema: {
					a: z.number(),
					b: z.number(),
				},
			},
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
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
			const typeMessage = body?.messageData?.typeMessage || "";

			let textMessage = "";

			if (typeMessage === "textMessage") {
				textMessage = body?.messageData?.textMessageData?.textMessage || "";
			}

			if (typeMessage === "extendedTextMessage") {
				textMessage = body?.messageData?.extendedTextMessageData?.text || "";
			}

			console.log("GREEN-API WEBHOOK:", {
				sender,
				senderName,
				typeMessage,
				textMessage,
			});

			return Response.json({
				ok: true,
				received: true,
				sender,
				senderName,
				typeMessage,
				textMessage,
			});
		}

		return new Response("Mohammed MCP Server is running. Use /mcp endpoint.", {
			status: 200,
		});
	},
};
