import { Injectable } from '@nestjs/common'
import { Cat } from './entities/cat.entity.js'


@Injectable()
export class CatService {
    private cats : Cat[] = []

    public constructor(){
        console.log("constructor got called!");
    }

    create(cat : Cat){
        console.log('creatign cat');
        this.cats.push(cat)
        console.log(cat);
    } 

    findAll() : Cat[] {
        console.log('finding all cats');
        return this.cats;
    }
}