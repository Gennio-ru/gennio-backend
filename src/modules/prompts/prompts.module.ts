import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PromptsService } from "./prompts.service";
import { PromptsController } from "./prompts.controller";
import { Prompt } from "./prompt.entity";
import { FilesModule } from "../files/files.module";
import { ImageProcessingService } from "src/common/image/image-processing.service";
import { PromptsPreviewBootstrapService } from "./prompts-preview-bootstrap.service";

@Module({
  imports: [TypeOrmModule.forFeature([Prompt]), FilesModule],
  providers: [
    PromptsService,
    ImageProcessingService,
    PromptsPreviewBootstrapService,
  ],
  controllers: [PromptsController],
  exports: [PromptsService],
})
export class PromptsModule {}
