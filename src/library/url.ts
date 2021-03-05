export function stripDelimiterRight(path: string): string {
  while (path.endsWith('/')) {
    path = path.substr(0, path.length - 1);
  }
  return path;
}

export function stripDelimiterLeft(path: string): string {
  while (path.startsWith('/')) {
    path = path.substr(1, path.length - 1);
  }
  return path;
}

export function join(...parts: Array<string>): string {
  return (
    parts.reduce((left, right) => {
      return stripDelimiterRight(left) + '/' + stripDelimiterLeft(right);
    }) + '/'
  );
}
