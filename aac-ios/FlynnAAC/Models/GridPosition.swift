import Foundation

struct GridPosition: Codable, Equatable, Hashable {
    let row: Int
    let col: Int

    init(row: Int, col: Int) {
        self.row = row
        self.col = col
    }
}
