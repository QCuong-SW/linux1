# Package và cấu hình

## Package

| Nơi      | Package chính                                  | Mục đích                        |
| -------- | ---------------------------------------------- | ------------------------------- |
| Root     | prettier                                       | Format code và config           |
| Frontend | next, react, react-dom                         | App Router và UI                |
| Frontend | tailwindcss, @tailwindcss/postcss              | CSS                             |
| Frontend | zod                                            | Validation form                 |
| Backend  | @nestjs/common, core, platform-express         | HTTP framework                  |
| Backend  | @nestjs/config                                 | Đọc env                         |
| Backend  | @nestjs/jwt, bcryptjs                          | Token và hash mật khẩu          |
| Backend  | cookie-parser                                  | Đọc cookie nếu dùng auth cookie |
| Backend  | class-validator, class-transformer             | DTO validation                  |
| Backend  | prisma, @prisma/client, @prisma/adapter-pg, pg | ORM và PostgreSQL driver        |
| Backend  | jest, ts-jest, supertest, @nestjs/testing      | Unit và API test                |

Nest 11 dùng module CommonJS qua TypeScript NodeNext, Prisma 7 sinh client CommonJS tương ứng. Prisma 7 đặt URL trong `prisma.config.ts`; lúc viết Prisma service phải truyền `PrismaPg` adapter. Không dùng cách khởi tạo client từ tutorial Prisma cũ.

Một lockfile tại root khóa dependency của hai workspace. `npm ci` dùng trong CI/Docker; `npm install` khi chủ động thêm hoặc nâng package.

## File config

| File                            | Vai trò                                        |
| ------------------------------- | ---------------------------------------------- |
| .nvmrc, .npmrc                  | Node 24, npm và quy tắc install                |
| .editorconfig, .prettierrc.json | Format thống nhất                              |
| .gitignore, .dockerignore       | Loại secret, dependency và build output        |
| frontend/next.config.ts         | Standalone output cho Docker workspace         |
| frontend/tsconfig.json          | Strict TypeScript, alias @/*                   |
| frontend/postcss.config.mjs     | Tailwind v4                                    |
| frontend/eslint.config.mjs      | Next ESLint                                    |
| backend/nest-cli.json           | Nest CLI build                                 |
| backend/tsconfig*.json          | TypeScript, decorator và build output          |
| backend/eslint.config.mjs       | TypeScript ESLint                              |
| backend/jest.config.cjs         | Unit test, không cho pass giả khi chưa có test |
| backend/test/jest-e2e.json      | Test API/integration                           |
| backend/prisma.config.ts        | URL DB và vị trí schema/migration              |

## Env theo môi trường

| File thật           | Copy từ                 | Ai đọc                 |
| ------------------- | ----------------------- | ---------------------- |
| .env                | .env.example            | Compose dev PostgreSQL |
| frontend/.env.local | frontend/.env.example   | Next dev               |
| backend/.env        | backend/.env.example    | Nest/Prisma dev        |
| .env.production     | .env.production.example | Compose production     |

Không commit file env thật. Thay placeholder secret trước khi chạy production.

Dev frontend gọi `http://localhost:3001/api`; backend cho phép origin `http://localhost:3000`. Production frontend gọi `/api`, Nginx proxy về Nest. `NEXT_PUBLIC_API_URL` là biến công khai và được đóng vào bundle lúc build, không dùng chứa secret.

DB dev dùng `localhost:5432`. Backend container dùng `postgres:5432`. Password trong DATABASE_URL phải khớp POSTGRES_PASSWORD; dùng password URL-safe hoặc percent-encode khi có ký tự đặc biệt.

`HOST`, `PORT`, `API_PREFIX`, `FRONTEND_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN` mới là contract cấu hình; code đọc/validate các biến này sẽ được viết sau. Ví dụ JWT không quyết định cách lưu token. Nếu chọn cookie, cần chốt httpOnly, secure, sameSite, CORS credentials và chống CSRF ở bước auth.

## Lệnh chuẩn bị

- `npm run format:check`: kiểm tra format.
- `npm run lint`: lint hai workspace sau khi có source.
- `npm run typecheck`: kiểm tra TypeScript sau khi có source.
- `npm test`: unit test backend sau khi có test thật.
- `npm run build`: build hai app sau khi có entrypoint.
- `npm run db:generate`: sinh Prisma client sau khi có model.
- `npm run db:migrate`: tạo/apply migration dev.
- `npm run db:deploy`: apply migration đã commit vào production.

Không chạy migration dev trên production. Chưa có frontend test runner; sẽ chọn test cần thiết sau khi có giao diện thật.

## Tài liệu framework đã tham khảo

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Prisma 7 migration/configuration](https://docs.prisma.io/docs/orm/v6/more/upgrades/to-v7)
- [NestJS deployment](https://docs.nestjs.com/deployment)
