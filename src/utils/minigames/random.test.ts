import { describe, expect, it } from "vitest";
import { shuffle } from "./random";

describe("shuffle", () => {
  it("does not mutate its input and uses Fisher-Yates", () => {
    const source = [1, 2, 3, 4];
    let index = 0;
    const values = [0.5, 0, 0.5];
    expect(shuffle(source, () => values[index++])).toEqual([4, 2, 1, 3]);
    expect(source).toEqual([1, 2, 3, 4]);
  });

  it("keeps empty and single-item inputs stable", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["only"], () => 0)).toEqual(["only"]);
  });
});
