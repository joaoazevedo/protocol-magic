// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Fibonacci {
    /// @notice Returns F(n)
    function fib(uint256 n) external pure returns (uint256) {
        (uint256 f, ) = _fibPair(n);
        return f;
    }

    /// @dev Returns (F(n), F(n+1)) via fast-doubling
    function _fibPair(uint256 n) internal pure returns (uint256, uint256) {
        if (n == 0) {
            return (0, 1);
        }
        // recurse on ⌊n/2⌋
        (uint256 a, uint256 b) = _fibPair(n >> 1);
        unchecked {
            // c = F(2k)   = F(k) * [2·F(k+1) − F(k)]
            uint256 c = a * ((b << 1) - a);
            // d = F(2k+1) = F(k)^2 + F(k+1)^2
            uint256 d = a * a + b * b;
            if (n & 1 == 0) {
                return (c, d);
            } else {
                // odd case: F(2k+1), F(2k+2)
                return (d, c + d);
            }
        }
    }

    // Precompile wrapper at 0xF0
    // ~900 gas for n≈1M
    function fibonacciPrecompile(uint256 n) external view returns (uint256 r) {
        bytes memory inBuf = abi.encodePacked(n);
        assembly {
            let ok := staticcall(
                gas(),
                0xF0,
                add(inBuf, 0x20), mload(inBuf),
                mload(0x40),      0x20
            )
            if iszero(ok) { revert(0,0) }
            r := mload(mload(0x40))
        }
    }
}