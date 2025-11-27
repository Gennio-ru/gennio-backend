import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SOCKET_MODEL_JOB_EVENTS } from "./types/model-job.events";

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class ModelJobGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(
      "Client connected:",
      client.id,
      "origin:",
      process.env.FRONTEND_URL
    );
  }

  handleDisconnect(client: Socket) {
    console.log("Client disconnected:", client.id);
  }

  // Подписка клиента на конкретный jobId
  @SubscribeMessage(SOCKET_MODEL_JOB_EVENTS.SUBSCRIBE)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobId: string
  ) {
    client.join(jobId);
  }

  // Отправляем результат подписанным клиентам
  sendJobUpdate(jobId: string, payload: any) {
    this.server.to(jobId).emit(SOCKET_MODEL_JOB_EVENTS.UPDATE, payload);
  }
}
