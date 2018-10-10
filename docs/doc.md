# 后端 RESTful API 文档

### 目前已具有的功能：

- 验证 (auth)
- 用户 (user)
- 队伍 (team)
- 场地 (site)
- 文章 (article)

以下为具体的使用方法。

---

## 验证 (auth)

### 接口说明

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
验证接口提供用户登录功能，请求者通过 `username` 和 `password` 换取 `x-access-token`。

### 接口地址

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
`/api/auth`

### 请求参数

- POST

  使用用户名和密码登录，换取 `x-access-token` 。

  #### Header

  | Key          | Value            |
  | ------------ | ---------------- |
  | Content-Type | application/json |

  #### Body

  ```json
  {
    "username": "username",
    "password": "password"
  }
  ```

  #### Response

  若**验证成功**，则状态码为 `200`，将返回 JSON 格式的文本，例如：

  ```json
  {
    "auth": true,
    "token": "token",
    "id": 0,
    "username": "username"
  }
  ```

  请注意**妥善保存** `token`, 它将是标明该用户身份的凭证。

  若**用户不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: User does not exist.
  ```

  若**用户名或密码字段为空**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```

  若**用户名或密码错误**，则状态码为 `401`，将返回 JSON 格式的文本：

  ```json
  {
    "auth": false,
    "token": null
  }
  ```

<br>

---

## 用户 (user)

### 接口说明

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
用户接口提供用户创建、读取、更新、删除 (CRUD) 功能。

### 接口地址

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
`/api/users`

### 请求参数

- **HTTP 动词表**

  | Route          | HTTP Verb | Description          |
  | -------------- | --------- | -------------------- |
  | /api/users     | GET       | 获取所有用户信息     |
  | /api/users     | POST      | 新增一个用户         |
  | /api/users/:id | GET       | 获取相应 id 用户信息 |
  | /api/users/:id | PUT       | 更新相应 id 用户信息 |
  | /api/users/:id | DELETE    | 删除相应 id 用户     |

  <br>

- GET

  获取用户信息（登陆后才可用）。

  #### Query

  Query 仅当在获取多个用户信息（`GET /api/users`）时可用，但不是必需的。

  | Key        | Value              | Description |
  | ---------- | ------------------ | ----------- |
  | group      | `user` 或 `admin`  | 用户组      |
  | department | 系名               | 系别        |
  | class      | 班级名             | 班级        |
  | begin      | 查询结果的起始序号 | 分页起始    |
  | end        | 查询结果的结束序号 | 分页结束    |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若请求成功，则状态码为 `200`，将返回 JSON 格式的文本。其中单个用户的信息示例如下。

  **请注意，获取多个用户信息时，它们将构成一个数组返回。**

  ```json
  {
    "id": 1,
    "username": "username",
    "group": "user", // admin 为管理员组，user 为普通用户组。
    "email": "user@example.com",
    "department": "xx系",
    "class": "x71",
    "phone": 12345678901,
    "realname": "苦力怕",
    "studentId": 2017000001,
    "team": {
      // 只有加入了队伍才会有此字段。
      "id": 1,
      "isCaptain": true
    }
  }
  ```

  请注意，`phone`, `realname`, `studentId` 为隐私字段，只有管理员或本人能够获取到此字段。

  若**用户不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: User does not exist.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

* POST

  创建新用户。

  创建普通用户 (user) 时，无需传入 `x-access-token`。创建管理员用户 (admin) 时，需要传入 `x-access-token` 且传入者需要为管理员。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token 或 空 |
  | Content-Type   | application/json |

  #### Body

  创建**普通用户 (user)** 时，body 的内容需要为：

  ```json
  {
    "username": "username",
    "password": "password",
    "group": "user",
    "email": "user@example.com",
    "department": "xx系",
    "class": "x71",
    "phone": 12345678901,
    "realname": "苦力怕",
    "studentId": 2017000001
  }
  ```

  创建**管理员用户 (admin)** 时，body 的内容需要为：

  ```json
  {
    "username": "username",
    "password": "password",
    "group": "admin",
    "email": "user@example.com"
  }
  ```

  #### Response

  若**创建成功**，则状态码为 `201`，将返回 JSON 格式的文本，例如：

  ```json
  {
    "auth": true,
    "token": "token"
  }
  ```

  请注意**妥善保存** `token`, 它将是标明该用户身份的凭证。

  若**用户名、邮箱或学号冲突**，则状态码为 `409`, 将返回文本：

  ```
  409 Conflict: Username already exists.
  或
  409 Conflict: Email already exists.
  或
  409 Conflict: Student ID already exists.
  ```

  若**注册表单字段不完整**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```

  若**创建的是管理员账户但未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

* PUT

  更新用户信息（登陆后才可用）。

  修改其他用户的信息或变更用户组、学号、真实姓名需要管理员权限。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  只需要写出需要修改的字段。用户名和邮箱不能修改。例如，要修改手机号，则 Body 应如下：

  ```json
  {
    "phone": 12345678901
  }
  ```

  #### Response

  若**更新成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**用户不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: User does not exist.
  ```

* DELETE

  删除用户。需要管理员权限。

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**删除成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**用户不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: User does not exist.
  ```

<br>

---

## 队伍 (team)

### 接口说明

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
队伍接口提供队伍创建、读取、更新、删除 (CRUD) 以及成员管理功能。

### 接口地址

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
`/api/teams`

### 请求参数

- **HTTP 动词表**

  | Route                       | HTTP Verb | Description                     |
  | --------------------------- | --------- | ------------------------------- |
  | /api/teams                  | GET       | 获取所有队伍信息                |
  | /api/teams                  | POST      | 新增一个队伍                    |
  | /api/teams/:id              | GET       | 获取相应 id 队伍信息            |
  | /api/teams/:id              | PUT       | 更新相应 id 队伍信息            |
  | /api/teams/:id              | DELETE    | 删除相应 id 队伍                |
  | /api/teams/:id/members      | GET       | 获取相应 id 队伍的成员          |
  | /api/teams/:id/members      | POST      | 加入相应 id 队伍                |
  | /api/teams/:id/members/:uid | DELETE    | 删除相应 id 队伍中相应 uid 成员 |

  <br>

- GET `/api/teams` 或 `/api/teams/:id`

  获取队伍信息，按照 id 排列（登陆后才可用）。

  #### Query

  Query 仅当在获取多个队伍信息（`GET /api/teams`）时可用，但不是必需的。

  | Key   | Value                              | Description |
  | ----- | ---------------------------------- | ----------- |
  | sort  | `ascending` (默认) 或 `descending` | 排序顺序    |
  | begin | 查询结果的起始序号                 | 分页起始    |
  | end   | 查询结果的结束序号                 | 分页结束    |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**请求成功**，则状态码为 `200`，将返回 JSON 格式的文本。示例如下：

  **请注意，获取多个队伍信息时，它们将构成一个数组返回。**

  ```json
  {
    "id": 0,
    "name": "name",
    "description": "description",
    "members": [0, 1, 2], // 队伍成员的用户 id 数组。
    "captain": 0, // 队长的用户 id。
    "createdAt": "2018-09-05T03:24:31.753Z",
    "inviteCode": "123abcde" // 随机生成的 8 位邀请码。
  }
  ```

  请注意，`invitecode` 为隐私字段，只有管理员或本队队员能够获取到此字段。

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

- GET `/api/teams/:id/members`

  获取特定队伍的队员（登陆后才可用）。

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**请求成功**，则状态码为 `200`，将返回 JSON 格式的文本，例如：

  ```json
  [0, 1, 2]
  ```

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

- POST `/api/teams`

  创建新队伍（登陆后才可用）。

  创建者默认为队伍的队长，邀请码由后端随机生成并返回。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  ```json
  {
    "name": "name",
    "description": "description" // 可以没有该字段。
  }
  ```

  #### Response

  若**创建成功**，则状态码为 `201`，将返回 JSON 格式的文本。示例如下：

  ```json
  {
    "inviteCode": "123abcde"
  }
  ```

  若**队伍名冲突或请求者已加入队伍**，则状态码为 `409`, 将返回文本：

  ```
  409 Conflict: Team name already exists.
  或
  409 Conflict: User is already in a team.
  ```

  若**字段缺失或非法**，则状态码为 `422`，将返回 JSON 格式的错误信息，例如：

  ```json
  {
    "messages": ["Path `name` is required."]
  }
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

- POST `/api/teams/:id/members`

  加入相应 id 的队伍（登陆后才可用）。

  #### Query

  | Key        | Value      | Description |
  | ---------- | ---------- | ----------- |
  | inviteCode | 8 位字符串 | 邀请码      |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**加入成功**，则状态码为 `201`。

  若**请求者已加入队伍**，则状态码为 `409`, 将返回文本：

  ```
  409 Conflict: User is already in a team.
  ```

  若**缺失邀请码字段**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```

  若**邀请码错误**，则状态码为 `403`，将返回文本：

  ```
  403 Forbidden: Incorrect invite code.
  ```

  若**队伍人数超过上限**，则状态码为 `409`，将返回文本：

  ```
  409 Conflict: The number of members exceeds.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

- PUT `/api/teams/:id/members`

  更新相应 id 的队伍的信息（登陆后才可用）。

  队长能够修改本队队伍描述与变更队长。管理员除此之外，还能够修改队伍名称与直接更改队伍成员。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  只需要写出需要修改的字段。邀请码不能修改。例如，要修改队伍描述，则 Body 应如下：

  ```json
  {
    "description": "description"
  }
  ```

  #### Response

  若**更新成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

  若**队长或成员非法**，则状态码为 `400`，将返回文本：

  ```
  400 Bad Request: Invalid members.
  或
  400 Bad Request: Captain is not a member of the team.
  ```

* DELETE `/api/teams/:id`

  删除相应 id 的队伍，并删除相应的预约。（管理员或队长功能）。

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**删除成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

* DELETE `/api/teams/:id/members/:uid`

  删除相应 id 的队伍中相应 uid 的成员。（登陆后才可用）

  普通成员只能删除自己（即退出），队长可删除本队伍成员，管理员可删除所有队伍的成员。

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**删除成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**队伍不存在或成员不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  或
  404 Not Found: Member does not exist.
  ```

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**试图删除队长**，则状态码为 `400`，将返回文本：

  ```
  400 Bad Request: Captain cannot be deleted.
  ```

<br>

---

## 场地 (site)

### 接口说明

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
场地接口提供场地的创建、读取、更新、删除 (CRUD) 以及场地预约功能。

### 接口地址

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
`/api/sites`

### 请求参数

- **HTTP 动词表**

  | Route                       | HTTP Verb | Description                |
  | --------------------------- | --------- | -------------------------- |
  | /api/sites                  | GET       | 获取所有场地信息           |
  | /api/sites                  | POST      | 新增一个场地               |
  | /api/sites/:id              | GET       | 获取相应 id 场地信息       |
  | /api/sites/:id              | PUT       | 更新相应 id 场地信息       |
  | /api/sites/:id              | DELETE    | 删除相应 id 场地           |
  | /api/sites/:id/appointments | GET       | 获取相应 id 场地的预约情况 |
  | /api/sites/:id/appointments | POST      | 预约相应 id 场地           |
  | /api/sites/:id/appointments | DELETE    | 删除相应 id 场地中某条预约 |

  <br>

- GET `/api/sites` 或 `/api/sites/:id`

  获取场地信息（登陆后才可用）。

  #### Query

  Query 仅当在获取多个场地信息（`GET /api/sites`）时可用，但不是必需的。

  | Key   | Value              | Description |
  | ----- | ------------------ | ----------- |
  | begin | 查询结果的起始序号 | 分页起始    |
  | end   | 查询结果的结束序号 | 分页结束    |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**请求成功**，则状态码为 `200`，将返回 JSON 格式的文本。示例如下：

  **请注意，获取多个队伍信息时，它们将构成一个数组返回。**

  ```json
  {
    "id": 0,
    "name": "场地 1",
    "description": "主楼 xxx",
    "capacity": 10, // 容纳人数。
    "minDuration": 60, // 最短/最长预约时长，单位为分钟。
    "maxDuration": 120,
    "appointments": [
      {
        "_id": "5ba50cfb7db5b123cc01c22d", // 请忽略本字段。
        "teamId": 0,
        "startTime": "2018-09-10T08:00:00.000Z",
        "endTime": "2018-09-10T09:00:00.000Z"
      }
    ]
  }
  ```

  若**场地不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Site does not exist.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

- GET `/api/sites/:id/appointments`

  获取特定场地的预约情况（登陆后才可用）。

  #### Query

  Query 不是必需的。

  | Key       | Value        | Description |
  | --------- | ------------ | ----------- |
  | startTime | ISO 格式日期 | 起始时间    |
  | endTime   | ISO 格式日期 | 结束时间    |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**请求成功**，则状态码为 `200`，将返回 JSON 格式的文本，例如：

  ```json
  [
    {
      "teamId": 0,
      "startTime": "2018-09-10T08:00:00.000Z",
      "endTime": "2018-09-10T09:00:00.000Z"
    }
  ]
  ```

  若**场地不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Site does not exist.
  ```

  若**请求者未传入 `x-access-token` 或者 `x-access-token` 非法**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  ```

- POST `/api/sites`

  创建新场地（管理员功能）。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  ```json
  {
    "name": "name",
    "description": "description", // 可选。
    "capacity": 10, // 可选，默认为 10.
    "minDuration": 60, // 可选，默认为 60.
    "maxDuration": 120 // 可选，默认为 120.
  }
  ```

  #### Response

  若**创建成功**，则状态码为 `201`。

  若**场地名冲突**，则状态码为 `409`, 将返回文本：

  ```
  409 Conflict: Site name already exists.
  ```

  若**缺失场地名字段**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

- POST `/api/sites/:id/appointments`

  预约相应 id 的场地（队长功能）。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  ```json
  {
    "startTime": "2018-09-10T00:00:00.000Z",
    "endTime": "2018-09-10T01:00:00.000Z"
  }
  ```

  #### Response

  若**预约成功**，则状态码为 `201`。

  若**预约不合法（如时长不合法）**，则状态码为 `400`，将返回文本：

  ```
  400 Bad Request: Invalid appointment.
  ```

  若**请求者没有加入队伍**，则状态码为 `400`, 将返回文本：

  ```
  400 Bad Request: User is not in a team.
  ```

  若**超出队伍可用的预约次数**，则状态码为 `403`，将返回文本：

  ```
  403 Forbidden: The number of appointments exceeds.
  ```

  若**预约时间冲突或已达到场地最大容纳量**，则状态码为 `409`，将返回文本：

  ```
  409 Conflict: The team already has an appointment during this period.
  或
  409 Conflict: The site has reached its maximum capacity.
  ```

  若**缺失预约时间字段**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法或不是队长**，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**队伍不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist.
  ```

- PUT `/api/sites/:id`

  更新相应 id 的场地的信息（管理员功能）。

  #### Header

  | Key            | Value            |
  | -------------- | ---------------- |
  | x-access-token | 用户 token       |
  | Content-Type   | application/json |

  #### Body

  只需要写出需要修改的字段。例如，要修改队伍描述，则 Body 应如下：

  ```json
  {
    "description": "description"
  }
  ```

  要修改预约情况，则 Body 应如下：

  ```json
  {
    "appointments": [
      {
        "teamId": 0,
        "startTime": "2018-09-10T08:00:00.000Z",
        "endTime": "2018-09-10T09:00:00.000Z"
      }
    ]
  }
  ```

  #### Response

  若**更新成功**，则状态码为 `204`。

  若**预约时间不合法（如超过 2 小时，与他人时间重叠）**，则状态码为 `400`，将返回文本：

  ```
  400 Bad Request: Invalid appointment.
  ```

  若**场地名冲突**，则状态码为 `409`, 将返回文本：

  ```
  409 Conflict: Site name already exists.
  ```

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**场地不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Site does not exist.
  ```

  若**字段非法**，则状态码为 `422`，将返回 JSON 格式的错误信息，例如：

  ```json
  {
    "messages": ["Path `name` is required."]
  }
  ```

* DELETE `/api/sites/:id`

  删除相应 id 的场地。需要管理员权限。

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**删除成功**，则状态码为 `204`。

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**场地不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Site does not exist.
  ```

* DELETE `/api/sites/:id/appointments`

  删除相应 id 场地中，特定 id 队伍的起始预约时间为某个时刻的预约。（队长或管理员功能）

  管理员可取消所有队伍的预约，队长仅能取消本队的预约。

  #### Query

  | Key       | Value        | Description                 |
  | --------- | ------------ | --------------------------- |
  | startTime | ISO 格式日期 | 要删除的预约的起始时间      |
  | teamId    | 队伍 id      | 要删除的预约所属的队伍的 id |

  #### Header

  | Key            | Value      |
  | -------------- | ---------- |
  | x-access-token | 用户 token |

  #### Response

  若**删除成功**，则状态码为 `204`。

  若**请求者没有加入队伍**，则状态码为 `400`, 将返回文本：

  ```
  400 Bad Request: User is not in a team.
  ```

  若**请求者未传入 `x-access-token` 、 `x-access-token` 非法** 或权限不足，则状态码为 `401`，将返回文本：

  ```
  401 Unauthorized: Token required.
  或
  401 Unauthorized: Invalid or expired token.
  或
  401 Unauthorized: Insufficient permissions.
  ```

  若**场地、队伍或预约不存在**，则状态码为 `404`，将返回文本：

  ```
  404 Not Found: Team does not exist
  或
  404 Not Found: Site does not exist.
  或
  404 Not Found: No such appointment.
  ```

  若**缺失字段**，则状态码为 `422`，将返回文本：

  ```
  422 Unprocessable Entity: Missing essential post data.
  ```
