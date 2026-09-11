import { Injectable } from '@nestjs/common';
import { JobSourceAdapter } from '../interfaces/job-source.interface';
import { GreenhouseJobAdapter } from '../sources/greenhouse/greenhouse.adapter';

@Injectable()
export class JobSourceRegistryService {
    private readonly adapters = new Map<string, JobSourceAdapter>();

    constructor(private readonly greenhouseAdapter: GreenhouseJobAdapter) {
        // Register current active adapters
        this.registerAdapter(this.greenhouseAdapter);
    }

    registerAdapter(adapter: JobSourceAdapter): void {
        this.adapters.set(adapter.sourceId, adapter);
    }

    getAdapter(sourceId: string): JobSourceAdapter | undefined {
        return this.adapters.get(sourceId);
    }

    getAllAdapters(): JobSourceAdapter[] {
        return Array.from(this.adapters.values());
    }
}
