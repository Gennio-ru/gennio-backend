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
import { PaymentEntity } from "./payments.entity";
import { PaymentDto } from "./dto/payments.dto";
import { plainToInstance } from "class-transformer";

export const SOCKET_PAYMENT_EVENTS = {
  SUBSCRIBE: "subscribe_payment",
  UNSUBSCRIBE: "unsubscribe_payment",
  UPDATE: "payment_update",
} as const;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class PaymentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log("Payments WS connected:", client.id);
  }

  handleDisconnect(client: Socket) {
    console.log("Payments WS disconnected:", client.id);
  }

  @SubscribeMessage(SOCKET_PAYMENT_EVENTS.SUBSCRIBE)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() paymentId: string
  ) {
    client.join(`payment:${paymentId}`);
  }

  @SubscribeMessage(SOCKET_PAYMENT_EVENTS.UNSUBSCRIBE)
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() paymentId: string
  ) {
    client.leave(`payment:${paymentId}`);
  }

  sendPaymentUpdate(payment: PaymentEntity) {
    const room = `payment:${payment.id}`;

    const payload = plainToInstance(PaymentDto, payment);

    this.server.to(room).emit(SOCKET_PAYMENT_EVENTS.UPDATE, payload);
  }
}
