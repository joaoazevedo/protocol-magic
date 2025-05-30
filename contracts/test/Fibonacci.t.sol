// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Fibonacci} from "../src/Fibonacci.sol";

contract FibonacciTest is Test {
    Fibonacci public fibonacci;

    function setUp() public {
        fibonacci = new Fibonacci();
    }

    function testZero() public view {
        assertEq(fibonacci.fib(0), 0);
    }

    function testOne() public view {
        assertEq(fibonacci.fib(1), 1);
    }

    function testTwo() public view {
        assertEq(fibonacci.fib(2), 1);
    }

    function testSmallSequence() public view {
        uint256[8] memory expected = [uint256(0), 1, 1, 2, 3, 5, 8, 13];
        for (uint256 i = 0; i < expected.length; ++i) {
            assertEq(fibonacci.fib(i), expected[i], string(abi.encodePacked("fib(", vm.toString(i), ") wrong")));
        }
    }

    function testKnownValues() public view {
        assertEq(fibonacci.fib(10), 55);
        assertEq(fibonacci.fib(20), 6_765);
        assertEq(fibonacci.fib(30), 832_040);
        assertEq(fibonacci.fib(50), 12_586_269_025);
    }

    /// @notice Property-based test: F(n+2) == F(n) + F(n+1)  (mod 2^256)
    function testRecurrence(uint256 x) public view {
        uint256 n = bound(x, 0, 500);
        uint256 fn  = fibonacci.fib(n);
        uint256 fn1 = fibonacci.fib(n + 1);
        uint256 fn2 = fibonacci.fib(n + 2);
        uint256 sum;
        unchecked { sum = fn + fn1; }
        assertEq(fn2, sum, "F(n+2) != F(n) + F(n+1)");
    }

    /// @notice Fuzz test measuring gas, with n bounded to [0,1e6]
    function testFuzzGas(uint256 x) public view {
        // bound x into [0, 1_000_000]
        uint256 n = bound(x, 0, 1_000_000);

        uint256 before = gasleft();
        uint256 result = fibonacci.fib(n);
        uint256 used = before - gasleft();

        console.log("gas for x =", n, "is", used);

        // optional sanity check
        if (n <= 50) {
            // small values we can check exactly
            uint256[51] memory small = [
                uint256(0), 1, 1, 2, 3, 5, 8, 13, 21, 34,
                55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181,
                6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229,
                832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986,
                102334155, 165580141, 267914296, 433494437, 701408733, 1134903170, 1836311903, 2971215073, 4807526976, 7778742049,
                12586269025
            ];
            assertEq(result, small[n]);
        }
    }

    /// @notice log gas for n=370
    function testGas370() public view {
        uint256 before = gasleft();
        uint256 n = 370;
        uint256 result = fibonacci.fib(n);
        uint256 used = before - gasleft();
        assertEq(result, 94611056096305838013295371573764256526437182762229865607320618320601813254535);
        assertLt(used, 10_000);
        console.log("gas for fib(370):", used);
    }
}