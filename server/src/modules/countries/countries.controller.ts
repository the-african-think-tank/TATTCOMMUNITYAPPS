import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CountriesService, Country } from './countries.service';

@ApiTags('Platform Metadata: Countries')
@Controller('countries')
export class CountriesController {
    constructor(private readonly countriesService: CountriesService) {}

    @Get()
    @ApiOperation({ summary: 'Get all countries with ISO codes and flag emojis' })
    async findAll(): Promise<Country[]> {
        return this.countriesService.findAll();
    }
}
