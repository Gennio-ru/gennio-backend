import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { FileEntity } from "./files.entity";
import { S3Module } from "./s3.module";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { ImageModule } from "src/common/image/image.module";

@Module({
  imports: [
    ConfigModule,
    S3Module,
    TypeOrmModule.forFeature([FileEntity]),
    ImageModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
