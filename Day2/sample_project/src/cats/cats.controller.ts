import { Controller, Get } from "@nestjs/common";

@Controller('cats')
export class CatsController {

    @Get()
    allCats() : string {
        return "here is the cats"
    }
}