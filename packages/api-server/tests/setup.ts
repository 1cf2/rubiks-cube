// API testing setup
export const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
};

export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
};

export const createMockNext = () => jest.fn();