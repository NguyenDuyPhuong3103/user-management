const responseFormat = (
  ok: boolean,
  meta?: { [key: string]: any },
  resData?: any,
) => {
  return {
    meta: {
      ok,
      ...meta,
    },
    resData,
  }
}

export { responseFormat }
