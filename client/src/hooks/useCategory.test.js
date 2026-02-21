/**
 * Test written by Ng Hong Ray, A0253509A
 *
 * I am testing this custom hook using renderHook because it has minimal UI and mainly consists of:
 * - an initial state
 * - a useEffect side effect (axios GET)
 * - safe state updates depending on API response shape
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning 
 * - API outcome: Success vs Failure
 * - Success payload: category present vs category missing
 *
 * 2. Boundary Value Analysis 
 * - categories length: 0 (empty list) vs 1 (non-empty list)
 * - initial state before effect resolves: []
 *
 **/

import { renderHook, waitFor } from "@testing-library/react";
import useCategory from "./useCategory";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios;

describe("useCategory hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  //Boundary Value Analysis
  test("initial state -> []", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { category: [] } });

    const { result } = renderHook(() => useCategory());

    // initial assertion (empty before effect resolves)
    expect(result.current).toEqual([]);


    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toEqual([]));
  });

  //Boundary Value Analysis & Equivalence Partitioning
  test("axios success + category present -> returns categories", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { category: [{ _id: "1", name: "Cat1" }] },
    });

    const { result } = renderHook(() => useCategory());

    await waitFor(() =>
      expect(result.current).toEqual([{ _id: "1", name: "Cat1" }])
    );

    expect(result.current).toHaveLength(1);
  });

  //Equivalence Partitioning
  test("axios success but category missing -> remains []", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toEqual([]));
  });

  //Equivalence Partitioning
  test("axios failure -> logs error and keeps []", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    mockedAxios.get.mockRejectedValueOnce(new Error("network fail"));

    const { result } = renderHook(() => useCategory());

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    await waitFor(() => expect(logSpy).toHaveBeenCalled());
    //check state is still empty array on error
    expect(result.current).toEqual([]);
    logSpy.mockRestore();
  });

  //Boundary Value Analysis
  test("Axios success + empty list -> returns []", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { category: [] } });

    const { result } = renderHook(() => useCategory());
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toEqual([]));
    expect(result.current).toHaveLength(0);
  });
});
