import { Controller, Get, Req, Post, Param, Body } from "@nestjs/common";
import type { Request } from 'express';
import { CreateCatDto } from "./dto/create-cat.dto.js";
import { CatService } from "./cats.service.js";
import { Cat } from './entities/cat.entity.js'

@Controller('cats')
export class CatsController {

    constructor( private catService : CatService){}


    @Get()
    allCats(@Req() request : Request) : Cat[] {
        console.log(request.baseUrl, "testing");
        console.log(request.params)
        console.log(request.query)
        console.log(this.catService.findAll())
        return this.catService.findAll();
    }


    @Post()
    createCats(@Body() createCatDto : CreateCatDto) : string{
        console.log(createCatDto);
        this.catService.create(createCatDto);
        return "this create new cats"
    }

    @Get(':id')
    findOne(@Param() params : any): string{
        return "this is the " + params.id + " th cat"
    }


}