import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { UserRole } from "./types/user-role.enum";
import * as bcrypt from "bcryptjs";
import { FindUsersDto } from "./dto/find-users.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findMany(query: FindUsersDto): Promise<PaginationResult<User>> {
    return paginate<User>(this.userRepository, query, "user", (qb) => {
      const alias = qb.alias;

      if (query.search) {
        qb.andWhere(`(${alias}.email ILIKE :search)`, {
          search: `%${query.search}%`,
        });
      }

      if (query.role) {
        qb.andWhere(`${alias}.role = :role`, { role: query.role });
      }

      if (query.tokensMin !== undefined) {
        qb.andWhere(`${alias}.tokens >= :min`, { min: query.tokensMin });
      }

      if (query.tokensMax !== undefined) {
        qb.andWhere(`${alias}.tokens <= :max`, { max: query.tokensMax });
      }

      qb.orderBy(`${alias}.createdAt`, "DESC");
    });
  }

  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByYandexId(yandexId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { yandexId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async createByEmail(email: string, password?: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException("Email already in use");

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const newUser = this.userRepository.create({
      email,
      phone: null,
      passwordHash,
      role: UserRole.User,
      tokens: 0,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    return this.userRepository.save(newUser);
  }

  async createByPhone(phone: string, password?: string): Promise<User> {
    const existing = await this.findByPhone(phone);
    if (existing) throw new ConflictException("Phone already in use");

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const newUser = this.userRepository.create({
      email: null,
      phone,
      passwordHash,
      role: UserRole.User,
      tokens: 0,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    return this.userRepository.save(newUser);
  }

  async createByYandexId(data: {
    yandexId: string;
    email: string | null;
    isEmailVerified: boolean;
  }): Promise<User> {
    const { yandexId, email, isEmailVerified } = data;

    // Проверяем — вдруг пользователь с таким Яндекс-ID уже есть
    const existingByYandex = await this.userRepository.findOne({
      where: { yandexId },
    });
    if (existingByYandex) {
      throw new ConflictException("Yandex account already registered");
    }

    // Проверяем — если у нас пришёл email, нет ли уже пользователя с ним
    if (email) {
      const existingByEmail = await this.userRepository.findOne({
        where: { email },
      });
      if (existingByEmail) {
        throw new ConflictException("Email already in use");
      }
    }

    // Создаём нового пользователя
    const newUser = this.userRepository.create({
      yandexId,
      email,
      phone: null,
      passwordHash: null, // пароля нет — вход только через OAuth
      role: UserRole.User,
      tokens: 0,
      isActive: true,
      isEmailVerified,
      isPhoneVerified: false,
    });

    return this.userRepository.save(newUser);
  }

  async setPhoneVerified(userId: string, isVerified: boolean): Promise<User> {
    const user = await this.findById(userId);

    if (!user.phone) {
      throw new BadRequestException("User has no phone number to verify");
    }
    if (user.isPhoneVerified === isVerified) {
      return user; // ничего менять не нужно
    }

    await this.userRepository.update(userId, { isPhoneVerified: isVerified });
    return this.findById(userId);
  }

  async setEmailVerified(userId: string, isVerified: boolean): Promise<User> {
    const user = await this.findById(userId);

    if (!user.email) {
      throw new BadRequestException("User has email to verify");
    }
    if (user.isPhoneVerified === isVerified) {
      return user; // ничего менять не нужно
    }

    await this.userRepository.update(userId, { isEmailVerified: isVerified });
    return this.findById(userId);
  }

  async markLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    await this.userRepository.update(userId, { passwordHash });
  }

  async blockUser(userId: string, reason: string | null = null): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = reason;

    return this.userRepository.save(user);
  }

  async unblockUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedReason = null;

    return this.userRepository.save(user);
  }
}
