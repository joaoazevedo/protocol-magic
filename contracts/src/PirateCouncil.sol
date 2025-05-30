// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Pirate Council Ledger & Chart Generator
/// @notice Records loot per pirate and renders an on-chain bar-chart via a native precompile at 0xC0
contract PirateCouncil {
    struct PirateRecord {
        string name;
        address pirate;
        uint256 loot;
    }

    uint256 public round;
    mapping(uint256 => mapping(address => uint256)) public roundLoot;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;
    mapping(address => string)  public names;
    address[] public pirates;

    event HaulRecorded(address indexed pirate, string name, uint256 round, uint256 amount);
    event NewRound(uint256 round);

    address constant PNG_CHART_PRECOMPILE = address(uint160(0xC0));

    constructor() {
        address[] memory _pirates = new address[](4);
        string[] memory _names = new string[](4);
        _pirates[0] = 0xb1acb3aDEaD00000000000000000000000000000; _names[0] = "Blackbeard";
        _pirates[1] = 0xA11b0BbAaAAa0000000000000000000000000001; _names[1] = "Anne Bonny";
        _pirates[2] = 0xCa11c0Caca110000000000000000000000000002; _names[2] = "Calico Jack";
        _pirates[3] = 0xAA7eAD0000000000000000000000000000000003; _names[3] = "Mary Read";
        for (uint256 i = 0; i < _pirates.length; i++) {
            address pirate = _pirates[i];
            string memory name = _names[i];
            require(pirate != address(0), "pirate must be set");
            require(bytes(name).length > 0, "Name required");
            for (uint256 j = 0; j < i; j++) {
                require(_pirates[j] != pirate, "Duplicate pirate");
            }
            pirates.push(pirate);
            names[pirate] = name;
        }
    }

    function recordHaul(address pirate, uint256 amount) external {
        require(pirate != address(0),   "pirate must be set");
        require(amount > 0,               "Amount must be > 0");
        require(!hasSubmitted[round][pirate], "Already submitted this round");
        bool isRegistered = false;
        for (uint256 i = 0; i < pirates.length; i++) {
            if (pirates[i] == pirate) {
                isRegistered = true;
                break;
            }
        }
        require(isRegistered, "Pirate not registered");
        // Name is now fixed at registration, ignore input param
        roundLoot[round][pirate] = amount;
        hasSubmitted[round][pirate] = true;
        emit HaulRecorded(pirate, names[pirate], round, amount);
    }

    function piratesYetToReport() public view returns (address[] memory, string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < pirates.length; i++) {
            if (!hasSubmitted[round][pirates[i]]) {
                count++;
            }
        }
        address[] memory missing = new address[](count);
        string[] memory missingNames = new string[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < pirates.length; i++) {
            if (!hasSubmitted[round][pirates[i]]) {
                missing[idx] = pirates[i];
                missingNames[idx] = names[pirates[i]];
                idx++;
            }
        }
        return (missing, missingNames);
    }

    function hoistTheColors() external {
        // Only allow new round if all pirates have submitted
        for (uint256 i = 0; i < pirates.length; i++) {
            require(hasSubmitted[round][pirates[i]], "Not all pirates have reported");
        }
        round++;
        emit NewRound(round);
    }

    function getLootTotals() public view returns (PirateRecord[] memory recs) {
        uint256 len = pirates.length;
        recs = new PirateRecord[](len);
        for (uint i = 0; i < len; i++) {
            address off = pirates[i];
            uint256 totalLoot = 0;
            for (uint256 r = 0; r <= round; r++) {
                totalLoot += roundLoot[r][off];
            }
            recs[i] = PirateRecord({
                name:   names[off],
                pirate: off,
                loot:   totalLoot
            });
        }
    }

    /// @notice Returns the list of pirate addresses and names
    function getPirates() public view returns (address[] memory, string[] memory) {
        uint256 len = pirates.length;
        address[] memory addrs = new address[](len);
        string[] memory nms = new string[](len);
        for (uint256 i = 0; i < len; i++) {
            addrs[i] = pirates[i];
            nms[i] = names[pirates[i]];
        }
        return (addrs, nms);
    }

    /// @notice Packs up a PirateRecord[] and sends it to 0xC0
    function generateChart() public view returns (bytes memory) {
        PirateRecord[] memory recs = getLootTotals();
        require(recs.length > 0 && recs.length <= 10, "Need [1,10] pirates");
        bytes memory input = abi.encode(recs);
        (bool ok, bytes memory out) = PNG_CHART_PRECOMPILE.staticcall(input);
        require(ok, "precompile failed");
        return out;
    }
}