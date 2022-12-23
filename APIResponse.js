export class SuccessfulAPIResponse {
  data;

  constructor(data) {
    this.data = data;
  }

  toString() {
    return {
      status: {
        success: true,
        message: null
      },
      data: this.data
    }
  }

}

export class SuccessfulAPIResponseWithoutData {
  data;

  toString() {
    return {
      status: {
        success: true,
        message: null
      },
      data: null
    }
  }

}

export class FailedAPIResponse {
  message;

  constructor(message) {
    this.message = message;
  }

  toString() {
    return {
      status: {
        success: false,
        message: this.message
      },
      data: null
    }
  }

}
