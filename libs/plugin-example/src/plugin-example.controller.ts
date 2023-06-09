import { PublicEndpoint } from "@aetheria/common";
import { Controller, Get } from "@nestjs/common";
import { PluginExampleService } from "./plugin-example.service";

@Controller("plugin-example")
export class PluginExampleController {
	constructor(private examplePluginService: PluginExampleService) {}

	@PublicEndpoint()
	@Get()
	public async exampleControllerMethod(): Promise<{ example: string }> {
		return await this.examplePluginService.exampleMethod();
	}
}
