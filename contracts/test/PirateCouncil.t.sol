// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {PirateCouncil} from "../src/PirateCouncil.sol";

contract PirateCouncilTest is Test {
    PirateCouncil council;
    address pirate1 = 0xb1acb3aDEaD00000000000000000000000000000;
    address pirate2 = 0xA11b0BbAaAAa0000000000000000000000000001;
    address pirate3 = 0xCa11c0Caca110000000000000000000000000002;
    address pirate4 = 0xAA7eAD0000000000000000000000000000000003;

    function setUp() public {
        council = new PirateCouncil();
    }

    function testRegisterAndSubmitLoot() public {
        council.recordHaul(pirate1, 10 ether);
        council.recordHaul(pirate2, 5 ether);
        council.recordHaul(pirate3, 7 ether);
        council.recordHaul(pirate4, 8 ether);
        // Only one submission per pirate per round
        vm.expectRevert("Already submitted this round");
        council.recordHaul(pirate1, 1 ether);
    }

    function testPiratesYetToReport() public {
        council.recordHaul(pirate1, 10 ether);
        (address[] memory missing, string[] memory missingNames) = council.piratesYetToReport();
        assertEq(missing.length, 3);
        assertEq(missing[0], pirate2);
        assertEq(missing[1], pirate3);
        assertEq(missing[2], pirate4);
        assertEq(missingNames[0], "Anne Bonny");
        assertEq(missingNames[1], "Calico Jack");
        assertEq(missingNames[2], "Mary Read");
        council.recordHaul(pirate2, 5 ether);
        (missing, missingNames) = council.piratesYetToReport();
        assertEq(missing.length, 2);
        assertEq(missing[0], pirate3);
        assertEq(missing[1], pirate4);
        assertEq(missingNames[0], "Calico Jack");
        assertEq(missingNames[1], "Mary Read");
        council.recordHaul(pirate3, 7 ether);
        (missing, missingNames) = council.piratesYetToReport();
        assertEq(missing.length, 1);
        assertEq(missing[0], pirate4);
        assertEq(missingNames[0], "Mary Read");
        council.recordHaul(pirate4, 8 ether);
        (missing, missingNames) = council.piratesYetToReport();
        assertEq(missing.length, 0);
        assertEq(missingNames.length, 0);
    }

    function testCannotStartNewRoundUntilAllReported() public {
        council.recordHaul(pirate1, 10 ether);
        council.recordHaul(pirate2, 5 ether);
        council.recordHaul(pirate3, 7 ether);
        // Only 3 out of 4 pirates have reported
        vm.expectRevert("Not all pirates have reported");
        council.hoistTheColors();
        council.recordHaul(pirate4, 8 ether);
        // Now all have reported
        council.hoistTheColors();
        assertEq(council.round(), 1);
    }

    function testNewRoundAllowsNewSubmissions() public {
        council.recordHaul(pirate1, 10 ether);
        council.recordHaul(pirate2, 5 ether);
        council.recordHaul(pirate3, 7 ether);
        council.recordHaul(pirate4, 8 ether);
        council.hoistTheColors();
        // Can submit again in new round
        council.recordHaul(pirate1, 2 ether);
        council.recordHaul(pirate2, 3 ether);
        council.recordHaul(pirate3, 1 ether);
        council.recordHaul(pirate4, 4 ether);
        // Only one submission per pirate per round
        vm.expectRevert("Already submitted this round");
        council.recordHaul(pirate1, 1 ether);
    }

    function testGenerateChartTotalsAllRounds() public {
        council.recordHaul(pirate1, 10 ether);
        council.recordHaul(pirate2, 5 ether);
        council.recordHaul(pirate3, 7 ether);
        council.recordHaul(pirate4, 8 ether);
        council.hoistTheColors();
        council.recordHaul(pirate1, 2 ether);
        council.recordHaul(pirate2, 3 ether);
        council.recordHaul(pirate3, 1 ether);
        council.recordHaul(pirate4, 4 ether);
        // Generate chart and decode PirateRecord[]
        bytes memory png = council.generateChart();
        // We can't decode the PNG, but we can check the totals in storage
        uint256 total1 = 0;
        uint256 total2 = 0;
        uint256 total3 = 0;
        uint256 total4 = 0;
        for (uint256 r = 0; r <= council.round(); r++) {
            total1 += council.roundLoot(r, pirate1);
            total2 += council.roundLoot(r, pirate2);
            total3 += council.roundLoot(r, pirate3);
            total4 += council.roundLoot(r, pirate4);
        }
        assertEq(total1, 12 ether);
        assertEq(total2, 8 ether);
        assertEq(total3, 8 ether);
        assertEq(total4, 12 ether);
    }
} 