import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { UserService } from './user/user.service';
import { config } from 'dotenv';
const crypto = require('crypto');


config();

const port = process.env.PORT || 3005;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const userService = app.get(UserService);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
  });
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);

  //  (function(){const randomBytes = crypto.randomBytes(32);
  //   const randomHexHash = randomBytes.toString('hex');
  //   console.log(randomHexHash)})();

  (async function () {
    // await userService.subscribeForAll();
    console.log('Subscribing for all users')
  })();

}
bootstrap();