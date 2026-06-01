import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Mohammed Remote MCP Server
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Mohammed MCP Server",
		version: "1.0.0",
	});

	async init() {
		// Tool 1: Test connection
		this.server.registerTool(
			"test_connection",
			{
				description: "Test if Mohammed MCP Server is working",
				inputSchema: {},
			},
			async () => ({
				content: [
					{
						type: "text",
						text: "Mohammed MCP Server is working ✅",
					},
				],
			}),
		);

		// Tool 2: Simple addition
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
				content: [
					{
						type: "text",
						text: String(a + b),
					},
				],
			}),
		);

		// Tool 3: Calculator with multiple operations
		this.server.registerTool(
			"calculate",
			{
				description: "Calculate add, subtract, multiply, or divide",
				inputSchema: {
					operation: z.enum(["add", "subtract", "multiply", "divide"]),
					a: z.number(),
					b: z.number(),
				},
			},
			async ({ operation, a, b }) => {
				let result: number;

				switch (operation) {
					case "add":
						result = a + b;
						break;

					case "subtract":
						result = a - b;
						break;

					case "multiply":
						result = a * b;
						break;

					case "divide":
						if (b === 0) {
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						}
						result = a / b;
						break;

					default:
						return {
							content: [
								{
									type: "text",
									text: "Error: Unknown operation",
								},
							],
						};
				}

				return {
					content: [
						{
							type: "text",
							text: String(result),
						},
					],
				};
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Mohammed MCP Server is running. Use /mcp endpoint.", {
			status: 200,
		});
	},
};
