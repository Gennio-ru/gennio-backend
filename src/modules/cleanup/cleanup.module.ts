import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { CleanupService } from "./cleanup.service";
import { ModelJob } from "../model-job/model-job.entity";
import { FileEntity } from "../files/files.entity";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ModelJob, FileEntity]),
    FilesModule,
  ],
  providers: [CleanupService],
})
export class CleanupModule {}
