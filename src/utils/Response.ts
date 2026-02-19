type ResponseType = {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: any;
  type?: string;
  token?: string;
  pagination?: {
    totalPage: number;
    currentPage: number;
    prevPage: number | null;
    nextPage: number | null;
    totalData: number;
  };
};

type ResponseObjectType = {
  status?: string;
  statusCode?: number;
  message?: string;
  data: {
    type?: string;
    attributes?: any;
  };
  token?: string;
  pagination?: {
    totalPage: number;
    currentPage: number;
    prevPage: number | null;
    nextPage: number | null;
    totalData: number;
  };
};

const Response = (response: ResponseType = {}): ResponseObjectType => {
  const responseObject: ResponseObjectType = {
    status: response.status,
    statusCode: response.statusCode,
    message: response.message,
    data: {},
  };

  if (response.type) {
    responseObject.data.type = response.type;
  }

  if (response.data) {
    responseObject.data = response.data;
  }

  if (response.token) {
    responseObject.token = response.token;
  }

  if (response.pagination) {
    responseObject.pagination = response.pagination;
  }

  return responseObject;
};

export default Response;
